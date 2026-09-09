import { query } from '$app/server';
import { idField } from '$lib/schemas/common';
import { db } from '$lib/server/db';
import { derivePlayerGameStats } from '$lib/stats/player-game-stats';
import { averageBy } from '$lib/utils/collection';
import { teamColorFromId, teamInitials } from '$lib/utils/team-identity';
import { z } from 'zod';

function pointsFromRaw(stat: {
	fgm: number;
	fg3m: number;
	ftm: number;
}) {
	return (stat.fgm - stat.fg3m) * 2 + stat.fg3m * 3 + stat.ftm;
}

type GameWithSides = {
	id: string;
	status: 'upcoming' | 'completed' | 'cancelled';
	scheduledAt: Date | null;
	completedAt: Date | null;
	homeTeamId: string;
	awayTeamId: string;
	homeTeamScore: number | null;
	awayTeamScore: number | null;
	homeTeam: { id: string; name: string };
	awayTeam: { id: string; name: string };
	playerStats: {
		playerId: string;
		fgm: number;
		fg3m: number;
		ftm: number;
		player: { teamId: string } | null;
	}[];
};

function resolveScores(game: GameWithSides) {
	const storedHome = game.homeTeamScore ?? 0;
	const storedAway = game.awayTeamScore ?? 0;
	if (storedHome > 0 || storedAway > 0) {
		return { home: storedHome, away: storedAway };
	}

	let home = 0;
	let away = 0;
	for (const stat of game.playerStats) {
		const teamId = stat.player?.teamId;
		const pts = pointsFromRaw(stat);
		if (teamId === game.homeTeamId) home += pts;
		else if (teamId === game.awayTeamId) away += pts;
	}
	return { home, away };
}

function streakLabel(results: ('W' | 'L')[]) {
	if (!results.length) return null;
	const first = results[0];
	let count = 0;
	for (const result of results) {
		if (result !== first) break;
		count += 1;
	}
	return `${first}${count}`;
}

async function standingsForDivision(divisionId: string, seasonId: string) {
	const teams = await db.query.team.findMany({
		where: { divisionId },
		columns: { id: true, name: true },
	});

	const games = await db.query.game.findMany({
		where: {
			seasonId,
			status: 'completed',
		},
		with: {
			homeTeam: { columns: { id: true, name: true } },
			awayTeam: { columns: { id: true, name: true } },
			playerStats: {
				with: { player: { columns: { teamId: true } } },
			},
		},
	});

	const teamIds = new Set(teams.map((t) => t.id));
	const divisionGames = games.filter(
		(g) => teamIds.has(g.homeTeamId) && teamIds.has(g.awayTeamId)
	) as GameWithSides[];

	const rows = teams.map((team) => {
		let wins = 0;
		let losses = 0;
		let gamesPlayed = 0;
		let pointsFor = 0;
		let pointsAgainst = 0;
		const chronological: { at: number; result: 'W' | 'L' }[] = [];

		for (const game of divisionGames) {
			if (game.homeTeamId !== team.id && game.awayTeamId !== team.id) continue;

			const scores = resolveScores(game);
			const isHome = game.homeTeamId === team.id;
			const teamScore = isHome ? scores.home : scores.away;
			const oppScore = isHome ? scores.away : scores.home;
			gamesPlayed += 1;
			pointsFor += teamScore;
			pointsAgainst += oppScore;

			if (teamScore === oppScore) continue;

			const result: 'W' | 'L' = teamScore > oppScore ? 'W' : 'L';
			if (result === 'W') wins += 1;
			else losses += 1;

			const at = (game.completedAt ?? game.scheduledAt ?? new Date(0)).getTime();
			chronological.push({ at, result });
		}

		chronological.sort((a, b) => a.at - b.at);

		return {
			teamId: team.id,
			name: team.name,
			wins,
			losses,
			gamesPlayed,
			ppg: gamesPlayed ? pointsFor / gamesPlayed : 0,
			oppPpg: gamesPlayed ? pointsAgainst / gamesPlayed : 0,
			diff: pointsFor - pointsAgainst,
			resultsNewestFirst: chronological
				.slice()
				.reverse()
				.map((g) => g.result),
		};
	});

	rows.sort((a, b) => {
		if (b.wins !== a.wins) return b.wins - a.wins;
		if (b.diff !== a.diff) return b.diff - a.diff;
		return b.ppg - a.ppg;
	});

	return { rows, divisionGames };
}

export const getTeamOverview = query(
	z.object({
		teamId: idField,
		divisionId: idField,
		seasonId: idField,
	}),
	async ({ teamId, divisionId, seasonId }) => {
		const [team, coaches, { rows, divisionGames }] = await Promise.all([
			db.query.team.findFirst({
				where: { id: teamId },
				columns: { id: true, name: true },
			}),
			db.query.coach.findMany({
				where: { teamId },
				columns: { name: true },
				limit: 1,
			}),
			standingsForDivision(divisionId, seasonId),
		]);

		const standing = rows.find((row) => row.teamId === teamId);
		const rank = standing ? rows.findIndex((row) => row.teamId === teamId) + 1 : null;

		const teamGames = divisionGames
			.filter((g) => g.homeTeamId === teamId || g.awayTeamId === teamId)
			.map((game) => {
				const scores = resolveScores(game);
				const isHome = game.homeTeamId === teamId;
				const teamScore = isHome ? scores.home : scores.away;
				const oppScore = isHome ? scores.away : scores.home;
				const opponent = isHome ? game.awayTeam : game.homeTeam;
				const result: 'W' | 'L' | 'T' =
					teamScore > oppScore ? 'W' : teamScore < oppScore ? 'L' : 'T';
				const at = game.completedAt ?? game.scheduledAt;

				return {
					id: game.id,
					result,
					teamScore,
					oppScore,
					opponentName: opponent.name,
					completedAt: at,
					sortAt: (at ?? new Date(0)).getTime(),
				};
			})
			.sort((a, b) => b.sortAt - a.sortAt);

		const upcoming = await db.query.game.findMany({
			where: {
				seasonId,
				status: 'upcoming',
			},
			with: {
				homeTeam: { columns: { id: true, name: true } },
				awayTeam: { columns: { id: true, name: true } },
			},
			orderBy: { scheduledAt: 'asc' },
		});

		const next = upcoming.find((g) => g.homeTeamId === teamId || g.awayTeamId === teamId);
		const nextOpponent = next
			? next.homeTeamId === teamId
				? next.awayTeam
				: next.homeTeam
			: null;

		const players = await db.query.player.findMany({
			where: { teamId },
			with: { gameStats: true },
		});

		const playerAverages = players
			.map((player) => {
				const derived = player.gameStats.map(derivePlayerGameStats);
				if (!derived.length) return null;
				return {
					playerId: player.id,
					name: player.name,
					jerseyNumber: player.jerseyNumber,
					points: averageBy(derived, (s) => s.pts) ?? 0,
					rebounds: averageBy(derived, (s) => s.reb) ?? 0,
					assists: averageBy(derived, (s) => s.ast) ?? 0,
					gamesPlayed: derived.length,
				};
			})
			.filter((p) => p !== null);

		const leaderFor = (key: 'points' | 'rebounds' | 'assists', label: string, suffix: string) => {
			const leader = playerAverages.reduce<(typeof playerAverages)[number] | null>((best, p) => {
				if (!best || p[key] > best[key]) return p;
				return best;
			}, null);

			return {
				key,
				label,
				suffix,
				player: leader
					? {
							id: leader.playerId,
							name: leader.name,
							jerseyNumber: leader.jerseyNumber,
							value: leader[key],
						}
					: null,
			};
		};

		return {
			teamName: team?.name ?? 'Team',
			initials: teamInitials(team?.name ?? 'T'),
			color: teamColorFromId(teamId),
			coachName: coaches[0]?.name ?? null,
			sportLabel: 'Basketball',
			record: {
				wins: standing?.wins ?? 0,
				losses: standing?.losses ?? 0,
			},
			ppg: standing?.ppg ?? 0,
			oppPpg: standing?.oppPpg ?? 0,
			rank,
			teamsInDivision: rows.length,
			streak: streakLabel(standing?.resultsNewestFirst ?? []),
			recentGames: teamGames.slice(0, 5).map(({ sortAt: _, ...game }) => game),
			nextGame: next
				? {
						opponentName: nextOpponent?.name ?? 'TBD',
						scheduledAt: next.scheduledAt,
					}
				: null,
			leaders: [
				leaderFor('points', 'Points', 'PPG'),
				leaderFor('rebounds', 'Rebounds', 'RPG'),
				leaderFor('assists', 'Assists', 'APG'),
			],
			rosterAverages: playerAverages.sort((a, b) => b.points - a.points),
		};
	}
);
