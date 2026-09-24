import { db } from '$lib/server/db';
import { notFound } from '$lib/server/fail';
import { derivePlayerGameStats } from '$lib/stats/player-game-stats';
import { ratingMeaning } from '$lib/stats/game-rating';
import { rawStatKeys } from '$lib/schemas/player-game-stat';
import type { RawPlayerGameStats } from '$lib/server/db/schema';

function pointsFromRaw(stat: { fgm: number; fg3m: number; ftm: number; recordedPts: number | null }) {
	if (stat.recordedPts != null) return stat.recordedPts;
	return (stat.fgm - stat.fg3m) * 2 + stat.fg3m * 3 + stat.ftm;
}

type StatWithPlayer = RawPlayerGameStats & {
	player?: {
		id: string;
		name: string;
		jerseyNumber: string;
		teamId: string;
	} | null;
};

function hasSheetStats(stat: StatWithPlayer) {
	return stat.recordedPts != null || rawStatKeys.some((key) => Number(stat[key]) > 0);
}

function playerRowsForTeam(playerStats: StatWithPlayer[], teamId: string) {
	return playerStats
		.filter((stat) => stat.player?.teamId === teamId && hasSheetStats(stat))
		.map((stat) => {
			const derived = derivePlayerGameStats(stat);
			return {
				playerId: derived.playerId,
				name: stat.player?.name ?? 'Unknown',
				jerseyNumber: stat.player?.jerseyNumber ?? '',
				teamId,
				pts: derived.pts,
				pointsOnly: derived.pointsOnly,
				reb: derived.reb,
				ast: derived.ast,
				stl: derived.stl,
				blk: derived.blk,
				tov: derived.tov,
				fgm: derived.fgm,
				fga: derived.fga,
				fg3m: derived.fg3m,
				fg3a: derived.fg3a,
				ftm: derived.ftm,
				fta: derived.fta,
				fgPct: derived.fgPct,
				fg3Pct: derived.fg3Pct,
				ftPct: derived.ftPct,
				eff: derived.eff,
				oreb: derived.oreb,
				gameRating: derived.gameRating,
				ratingMeaning: derived.gameRating == null ? null : ratingMeaning(derived.gameRating),
				ratingBreakdown: derived.ratingBreakdown,
				impactScore: derived.impactScore,
				ratingPercentile: derived.ratingPercentile,
				contextBonus: derived.contextBonus,
			};
		})
		.sort((a, b) => b.pts - a.pts);
}

type BoxPlayer = ReturnType<typeof playerRowsForTeam>[number];

function pickPlayerOfTheGame(players: BoxPlayer[]) {
	if (!players.length) return null;

	const rated = players.filter((player) => player.gameRating != null);
	if (rated.length) {
		return [...rated].sort((a, b) => {
			if (b.gameRating !== a.gameRating) return (b.gameRating ?? 0) - (a.gameRating ?? 0);
			if (b.pts !== a.pts) return b.pts - a.pts;
			return b.eff - a.eff;
		})[0];
	}

	return [...players].sort((a, b) => {
		if (b.pts !== a.pts) return b.pts - a.pts;
		if (b.reb !== a.reb) return b.reb - a.reb;
		if (b.ast !== a.ast) return b.ast - a.ast;
		return b.eff - a.eff;
	})[0];
}

export async function loadBoxScore(gameId: string) {
	const game = await db.query.game.findFirst({
		where: { id: gameId },
		with: {
			homeTeam: { with: { division: { columns: { id: true, slug: true } } } },
			awayTeam: { with: { division: { columns: { id: true, slug: true } } } },
			playerStats: {
				with: {
					player: true,
				},
			},
		},
	});

	if (!game) {
		notFound({ resource: 'game', id: gameId });
	}

	if (!game.homeTeam || !game.awayTeam) {
		notFound(
			{ resource: 'game', id: gameId },
			{ message: 'Game is missing home or away team' }
		);
	}

	const storedHome = game.homeTeamScore ?? 0;
	const storedAway = game.awayTeamScore ?? 0;

	let homeScore = storedHome;
	let awayScore = storedAway;

	if (homeScore === 0 && awayScore === 0) {
		for (const stat of game.playerStats) {
			if (!hasSheetStats(stat)) continue;
			const pts = pointsFromRaw(stat);
			if (stat.player?.teamId === game.homeTeamId) homeScore += pts;
			else if (stat.player?.teamId === game.awayTeamId) awayScore += pts;
		}
	}

	const homePlayers = playerRowsForTeam(game.playerStats, game.homeTeamId);
	const awayPlayers = playerRowsForTeam(game.playerStats, game.awayTeamId);
	const playerOfTheGame = pickPlayerOfTheGame([...homePlayers, ...awayPlayers]);
	const potgTeam =
		playerOfTheGame?.teamId === game.homeTeamId
			? game.homeTeam
			: playerOfTheGame?.teamId === game.awayTeamId
				? game.awayTeam
				: null;

	return {
		id: game.id,
		seasonId: game.seasonId,
		name: game.name,
		status: game.status,
		gameType: game.gameType,
		statsAvailable: game.statsAvailable,
		pointsOnly: game.pointsOnly,
		completedAt: game.completedAt,
		scheduledAt: game.scheduledAt,
		playerOfTheGame: playerOfTheGame
			? {
					playerId: playerOfTheGame.playerId,
					name: playerOfTheGame.name,
					jerseyNumber: playerOfTheGame.jerseyNumber,
					pts: playerOfTheGame.pts,
					reb: playerOfTheGame.reb,
					ast: playerOfTheGame.ast,
					teamId: playerOfTheGame.teamId,
					teamName: potgTeam?.name ?? '',
					teamSlug: potgTeam?.slug ?? '',
					divisionSlug: potgTeam?.division?.slug ?? '',
				}
			: null,
		homeTeam: {
			id: game.homeTeam.id,
			name: game.homeTeam.name,
			slug: game.homeTeam.slug,
			divisionId: game.homeTeam.divisionId,
			divisionSlug: game.homeTeam.division?.slug ?? '',
			score: homeScore,
			players: homePlayers,
		},
		awayTeam: {
			id: game.awayTeam.id,
			name: game.awayTeam.name,
			slug: game.awayTeam.slug,
			divisionId: game.awayTeam.divisionId,
			divisionSlug: game.awayTeam.division?.slug ?? '',
			score: awayScore,
			players: awayPlayers,
		},
	};
}
