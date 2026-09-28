import { query } from '$app/server';
import {
	isPlayerIdentityChange,
	isScheduleChange,
	relayDashboard,
} from '$lib/server/dashboard-sync.server';
import { idField } from '$lib/schemas/common';
import { db } from '$lib/server/db';
import { divisionPlaceForTeam, divisionPlaceLabel } from '$lib/stats/division-place';
import { defaultResultLabel, isDefaultGame } from '$lib/schemas/game';
import { lineupPlayerFromGames, type LineupGame } from '$lib/ai/lineup';
import { ensureSeasonGameRatings } from '$lib/server/game-rating.server';
import { dedupeByMatchup, dedupeMatchups, matchupKey } from '$lib/stats/matchup';
import { regularSeasonGames, regularSeasonStandings } from '$lib/stats/standings';
import { teamColorFromId, teamInitials } from '$lib/utils/team-identity';
import { z } from 'zod';

function pointsFromRaw(stat: {
	fgm: number;
	fg3m: number;
	ftm: number;
	recordedPts?: number | null;
}) {
	if (stat.recordedPts != null) return stat.recordedPts;
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
	gameType?: string;
	statsAvailable?: boolean;
	pointsOnly?: boolean;
	defaultLossSide?: string | null;
	homeTeam: { id: string; name: string };
	awayTeam: { id: string; name: string };
	playerStats: {
		playerId: string;
		fgm: number;
		fg3m: number;
		ftm: number;
		recordedPts?: number | null;
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
	const inDivision = games.filter((g) => teamIds.has(g.homeTeamId) && teamIds.has(g.awayTeamId));
	const divisionGames = dedupeMatchups(inDivision) as GameWithSides[];
	const scoredGames = inDivision.map((game) => {
		const scores = resolveScores(game as GameWithSides);
		return { ...game, homeTeamScore: scores.home, awayTeamScore: scores.away };
	});
	const regularGames = regularSeasonGames(scoredGames, teamIds);
	const standings = regularSeasonStandings(
		teams.map((team) => team.id),
		scoredGames
	);
	const standingByTeam = new Map(standings.map((row) => [row.teamId, row]));

	const rows = teams.map((team) => {
		const standing = standingByTeam.get(team.id);
		const wins = standing?.wins ?? 0;
		const losses = standing?.losses ?? 0;
		const ties = standing?.ties ?? 0;
		const gamesPlayed = wins + losses + ties;
		const pointsFor = standing?.pointsFor ?? 0;
		const pointsAgainst = standing?.pointsAgainst ?? 0;
		const chronological: { at: number; result: 'W' | 'L' }[] = [];

		for (const game of regularGames) {
			if (game.homeTeamId !== team.id && game.awayTeamId !== team.id) continue;
			const isHome = game.homeTeamId === team.id;
			const teamScore = isHome ? game.homeTeamScore : game.awayTeamScore;
			const oppScore = isHome ? game.awayTeamScore : game.homeTeamScore;
			if (teamScore === oppScore) continue;
			const at = (game.completedAt ?? game.scheduledAt ?? new Date(0)).getTime();
			chronological.push({ at, result: teamScore > oppScore ? 'W' : 'L' });
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
			rank: standing?.rank ?? null,
			resultsNewestFirst: chronological
				.slice()
				.reverse()
				.map((g) => g.result),
		};
	});

	const order = new Map(standings.map((row, index) => [row.teamId, index]));
	rows.sort((a, b) => (order.get(a.teamId) ?? 0) - (order.get(b.teamId) ?? 0));

	return { rows, divisionGames };
}

export const getTeamOverview = query.live(
	z.object({
		teamId: idField,
		divisionId: idField,
		seasonId: idField,
		/** Changes the query when a rename moves the team page, so the open view reloads. */
		teamSlug: z.string().optional(),
	}),
	({ teamId, divisionId, seasonId }) =>
		relayDashboard(
			async () => {
				await ensureSeasonGameRatings(seasonId);
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
				const rank = standing?.rank ?? null;
				const place = divisionPlaceForTeam(
					teamId,
					divisionGames.map((game) => {
						const scores = resolveScores(game);
						return {
							gameType: game.gameType ?? 'regular',
							homeTeamId: game.homeTeamId,
							awayTeamId: game.awayTeamId,
							homeScore: scores.home,
							awayScore: scores.away,
							completedAt: (game.completedAt ?? game.scheduledAt ?? new Date(0)).getTime(),
						};
					})
				);
				const divisionPlace = place ? divisionPlaceLabel(place) : null;

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
							status: 'completed' as const,
							result,
							defaultResult: isDefaultGame(game)
								? defaultResultLabel(game.defaultLossSide, isHome)
								: null,
							pointsOnly: game.pointsOnly ?? false,
							teamScore,
							oppScore,
							opponentName: opponent.name,
							completedAt: at,
							scheduledAt: game.scheduledAt,
							gameType: game.gameType,
							statsAvailable: game.statsAvailable,
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

				const playedKeys = new Set(divisionGames.map((game) => matchupKey(game)));
				const teamUpcoming = dedupeMatchups(
					upcoming.filter((g) => g.homeTeamId === teamId || g.awayTeamId === teamId)
				)
					.filter((g) => !playedKeys.has(matchupKey(g)))
					.map((game) => {
						const isHome = game.homeTeamId === teamId;
						const opponent = isHome ? game.awayTeam : game.homeTeam;
						return {
							id: game.id,
							status: 'upcoming' as const,
							result: null as 'W' | 'L' | 'T' | null,
							defaultResult: null as 'Default lose' | 'Default win' | null,
							pointsOnly: false,
							teamScore: null as number | null,
							oppScore: null as number | null,
							opponentName: opponent?.name ?? 'TBD',
							completedAt: null as Date | null,
							scheduledAt: game.scheduledAt,
							gameType: game.gameType,
							statsAvailable: game.statsAvailable,
							sortAt: (game.scheduledAt ?? new Date(0)).getTime(),
						};
					});

				const next = teamUpcoming[0] ?? null;

				const schedule = [
					...teamUpcoming.map(({ sortAt: _, ...game }) => game),
					...teamGames.map(({ sortAt: _, ...game }) => game),
				];

				const players = await db.query.player.findMany({
					where: { teamId },
					with: {
						gameStats: {
							with: {
								game: {
									columns: {
										id: true,
										homeTeamId: true,
										awayTeamId: true,
										gameType: true,
										status: true,
										statsAvailable: true,
										homeTeamScore: true,
										awayTeamScore: true,
										completedAt: true,
										scheduledAt: true,
									},
								},
							},
						},
					},
				});

				const playerAverages = players
					.map((player) => {
						const stats = dedupeByMatchup(player.gameStats, (stat) => stat.game);
						const games: LineupGame[] = stats.map((stat) => ({
							pointsOnly: stat.recordedPts != null,
							pts: pointsFromRaw(stat),
							oreb: stat.oreb,
							dreb: stat.dreb,
							ast: stat.ast,
							stl: stat.stl,
							blk: stat.blk,
							tov: stat.tov,
							pf: stat.pf,
							fgm: stat.fgm,
							fga: stat.fga,
							fg3m: stat.fg3m,
							fg3a: stat.fg3a,
							ftm: stat.ftm,
							fta: stat.fta,
							gameRating: stat.gameRating,
							playedAt: stat.game?.completedAt ?? stat.game?.scheduledAt ?? null,
						}));
						return lineupPlayerFromGames(
							{
								playerId: player.id,
								name: player.name,
								jerseyNumber: player.jerseyNumber,
							},
							games
						);
					})
					.filter((p) => p !== null);

				const leaderFor = (
					key: 'points' | 'rebounds' | 'assists',
					label: string,
					suffix: string
				) => {
					const leader = playerAverages.reduce<(typeof playerAverages)[number] | null>(
						(best, p) => {
							if (!best || p[key] > best[key]) return p;
							return best;
						},
						null
					);

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
					divisionPlace,
					teamsInDivision: rows.length,
					streak: streakLabel(standing?.resultsNewestFirst ?? []),
					recentGames: teamGames.map(({ sortAt: _, ...game }) => game),
					schedule,
					nextGame: next
						? {
								opponentName: next.opponentName,
								scheduledAt: next.scheduledAt,
								gameType: next.gameType ?? 'regular',
							}
						: null,
					leaders: [
						leaderFor('points', 'Points', 'PPG'),
						leaderFor('rebounds', 'Rebounds', 'RPG'),
						leaderFor('assists', 'Assists', 'APG'),
					],
					rosterAverages: playerAverages.sort((a, b) => b.points - a.points),
				};
			},
			(_overview, change) =>
				isPlayerIdentityChange(change, { teamId }) || isScheduleChange(change, { seasonId, teamId })
		)
);
