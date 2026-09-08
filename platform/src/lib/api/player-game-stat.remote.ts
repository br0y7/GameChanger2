import { query } from '$app/server';
import { idField } from '$lib/schemas/common';
import { db } from '$lib/server/db';
import { derivePlayerGameStats } from '$lib/stats/player-game-stats';
import { count, eq } from 'drizzle-orm';
import { z } from 'zod';
import * as table from '$lib/server/db/schema';
import { averageBy } from '$lib/utils/collection';

export const getPlayerGameStats = query(
	z.object({
		playerId: idField,
	}),
	async ({ playerId }) => {
		const rawStats = await db.query.playerGameStat.findMany({
			where: {
				playerId,
			},
			with: {
				game: true,
			},
		});

		return rawStats.map(derivePlayerGameStats);
	}
);

export const getPlayerGameCount = query(z.object({ playerId: idField }), async ({ playerId }) => {
	const [gameCount] = await db
		.select({ count: count() })
		.from(table.playerGameStat)
		.where(eq(table.playerGameStat.playerId, playerId));

	return gameCount.count;
});

export const getPlayerSeasonAverages = query(
	z.object({ playerId: idField }),
	async ({ playerId }) => {
		const stats = await getPlayerGameStats({ playerId });

		return {
			points: averageBy(stats, (stat) => stat.pts),
			assists: averageBy(stats, (stat) => stat.ast),
			turnovers: averageBy(stats, (stat) => stat.tov),
			shootingPercentage: averageBy(stats, (stat) => stat.fgPct),
		};
	}
);

const teamLeaderCategories = [
	{ key: 'points', label: 'Points' },
	{ key: 'rebounds', label: 'Rebounds' },
	{ key: 'assists', label: 'Assists' },
	{ key: 'steals', label: 'Steals' },
	{ key: 'blocks', label: 'Blocks' },
] as const;

export type TeamLeaderCategory = (typeof teamLeaderCategories)[number]['key'];

export const getTeamLeaders = query(z.object({ teamId: idField }), async ({ teamId }) => {
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
				averages: {
					points: averageBy(derived, (stat) => stat.pts) ?? 0,
					rebounds: averageBy(derived, (stat) => stat.reb) ?? 0,
					assists: averageBy(derived, (stat) => stat.ast) ?? 0,
					steals: averageBy(derived, (stat) => stat.stl) ?? 0,
					blocks: averageBy(derived, (stat) => stat.blk) ?? 0,
				},
			};
		})
		.filter((player) => player !== null);

	return teamLeaderCategories.map(({ key, label }) => {
		const leader = playerAverages.reduce<(typeof playerAverages)[number] | null>((best, player) => {
			if (!best || player.averages[key] > best.averages[key]) return player;
			return best;
		}, null);

		return {
			key,
			label,
			player: leader
				? {
						id: leader.playerId,
						name: leader.name,
						jerseyNumber: leader.jerseyNumber,
						value: leader.averages[key],
					}
				: null,
		};
	});
});
