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
