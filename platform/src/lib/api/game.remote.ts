import { command, query } from '$app/server';
import {
	isPlayerIdentityChange,
	isScheduleChange,
	publishScheduleChange,
	relayDashboard,
} from '$lib/server/dashboard-sync.server';
import { idField } from '$lib/schemas/common';
import { gameTypes } from '$lib/schemas/game';
import { db } from '$lib/server/db';
import { notFound } from '$lib/server/fail';
import { serverLogger } from '$lib/server/logger';
import { ratingMeaning } from '$lib/stats/game-rating';
import { loadBoxScore } from '$lib/server/game-box-score.server';
import { ensureSeasonGameRatings } from '$lib/server/game-rating.server';
import * as table from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { requireAdmin, requireUser } from './auth.remote';
import { z } from 'zod';

export const getGameBoxScore = query.live(z.object({ gameId: idField }), ({ gameId }) =>
	relayDashboard(
		async () => {
			await requireUser();
			return loadBoxScore(gameId);
		},
		(box, change) =>
			isPlayerIdentityChange(change, { teamIds: [box.homeTeam.id, box.awayTeam.id] }) ||
			isScheduleChange(change, { seasonId: box.seasonId })
	)
);

export const updateGameType = command(
	z.object({
		gameId: idField,
		gameType: z.enum(gameTypes),
	}),
	async ({ gameId, gameType }) => {
		await requireUser();

		const existing = await db.query.game.findFirst({
			where: { id: gameId },
			columns: { id: true, seasonId: true },
		});

		if (!existing) {
			notFound({ resource: 'game', id: gameId });
		}

		await db.update(table.game).set({ gameType }).where(eq(table.game.id, gameId));
		await publishScheduleChange(existing.seasonId);
		serverLogger.info('updated game type', { gameId, gameType });

		return { success: true as const, gameId, gameType };
	}
);

/**
 * Move a game to another calendar day, keeping its time of day.
 * A wrong date is worth fixing here: the date plus the two teams is how an import recognises a
 * game it has already stored, so re-uploading a corrected sheet files a second copy instead.
 */
export const updateGameDate = command(
	z.object({
		gameId: idField,
		/** Calendar day as YYYY-MM-DD, read from a date input. */
		playedOn: z.iso.date(),
	}),
	async ({ gameId, playedOn }) => {
		await requireAdmin();

		const existing = await db.query.game.findFirst({
			where: { id: gameId },
			columns: { id: true, seasonId: true, status: true, completedAt: true, scheduledAt: true },
		});

		if (!existing) {
			notFound({ resource: 'game', id: gameId });
		}

		const current = existing.completedAt ?? existing.scheduledAt;
		const [year, month, day] = playedOn.split('-').map(Number);
		const moved = new Date(current ?? 0);
		if (!current) moved.setHours(12, 0, 0, 0);
		moved.setFullYear(year, month - 1, day);

		const field = existing.status === 'completed' ? 'completedAt' : 'scheduledAt';
		await db
			.update(table.game)
			.set({ [field]: moved })
			.where(eq(table.game.id, gameId));
		await publishScheduleChange(existing.seasonId);
		serverLogger.info('updated game date', { gameId, playedOn, field });

		return { success: true as const, gameId, playedOn };
	}
);

export const getTopGamePerformances = query.live(
	z.object({
		seasonId: idField,
		limit: z.number().int().min(1).max(10).default(5),
	}),
	({ seasonId, limit }) =>
		relayDashboard(
			async () => {
				await requireUser();
				await ensureSeasonGameRatings(seasonId);

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

				return rows
					.sort((a, b) => b.rating - a.rating || a.playerName.localeCompare(b.playerName))
					.slice(0, limit);
			},
			(_rows, change) =>
				isPlayerIdentityChange(change, { seasonId }) || isScheduleChange(change, { seasonId })
		)
);
