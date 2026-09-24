import { command, query } from '$app/server';
import { idField } from '$lib/schemas/common';
import { gameTypes } from '$lib/schemas/game';
import { db } from '$lib/server/db';
import { notFound } from '$lib/server/fail';
import { serverLogger } from '$lib/server/logger';
import { ratingMeaning } from '$lib/stats/game-rating';
import { loadBoxScore } from '$lib/server/game-box-score.server';
import * as table from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { requireUser } from './auth.remote';
import { z } from 'zod';

export const getGameBoxScore = query(z.object({ gameId: idField }), async ({ gameId }) => {
	await requireUser();
	return loadBoxScore(gameId);
});

export const updateGameType = command(
	z.object({
		gameId: idField,
		gameType: z.enum(gameTypes),
	}),
	async ({ gameId, gameType }) => {
		await requireUser();

		const existing = await db.query.game.findFirst({
			where: { id: gameId },
			columns: { id: true },
		});

		if (!existing) {
			notFound({ resource: 'game', id: gameId });
		}

		await db.update(table.game).set({ gameType }).where(eq(table.game.id, gameId));
		serverLogger.info('updated game type', { gameId, gameType });

		return { success: true as const, gameId, gameType };
	}
);

export const getTopGamePerformances = query(
	z.object({
		seasonId: idField,
		limit: z.number().int().min(1).max(10).default(5),
	}),
	async ({ seasonId, limit }) => {
		await requireUser();

		const games = await db.query.game.findMany({
			where: { seasonId },
			with: {
				homeTeam: { columns: { id: true, name: true } },
				awayTeam: { columns: { id: true, name: true } },
				playerStats: {
					with: {
						player: { columns: { id: true, name: true, teamId: true } },
					},
				},
			},
		});

		const rows = [];
		for (const game of games) {
			for (const stat of game.playerStats) {
				if (stat.gameRating == null || !stat.player) continue;
				const isHome = stat.player.teamId === game.homeTeamId;
				rows.push({
					playerId: stat.player.id,
					playerName: stat.player.name,
					gameId: game.id,
					opponentName: (isHome ? game.awayTeam?.name : game.homeTeam?.name) ?? 'Opponent',
					rating: stat.gameRating,
					meaning: ratingMeaning(stat.gameRating),
				});
			}
		}

		return rows.sort((a, b) => b.rating - a.rating || a.playerName.localeCompare(b.playerName)).slice(0, limit);
	}
);
