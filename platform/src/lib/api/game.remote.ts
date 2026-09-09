import { query } from '$app/server';
import { idField } from '$lib/schemas/common';
import { db } from '$lib/server/db';
import { notFound } from '$lib/server/fail';
import { derivePlayerGameStats } from '$lib/stats/player-game-stats';
import { rawStatKeys } from '$lib/schemas/player-game-stat';
import type { RawPlayerGameStats } from '$lib/server/db/schema';
import { z } from 'zod';

function pointsFromRaw(stat: { fgm: number; fg3m: number; ftm: number }) {
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
	return rawStatKeys.some((key) => Number(stat[key]) > 0);
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
				pts: derived.pts,
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
			};
		})
		.sort((a, b) => b.pts - a.pts);
}

export const getGameBoxScore = query(z.object({ gameId: idField }), async ({ gameId }) => {
	const game = await db.query.game.findFirst({
		where: { id: gameId },
		with: {
			homeTeam: true,
			awayTeam: true,
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

	return {
		id: game.id,
		name: game.name,
		status: game.status,
		completedAt: game.completedAt,
		scheduledAt: game.scheduledAt,
		homeTeam: {
			id: game.homeTeam.id,
			name: game.homeTeam.name,
			slug: game.homeTeam.slug,
			divisionId: game.homeTeam.divisionId,
			score: homeScore,
			players: homePlayers,
		},
		awayTeam: {
			id: game.awayTeam.id,
			name: game.awayTeam.name,
			slug: game.awayTeam.slug,
			divisionId: game.awayTeam.divisionId,
			score: awayScore,
			players: awayPlayers,
		},
	};
});
