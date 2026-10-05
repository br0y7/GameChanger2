import { query } from '$app/server';
import { idField } from '$lib/schemas/common';
import { z } from 'zod';
import { db } from '$lib/server/db';
import { getPlayerGameStats } from './player-game-stat.remote';
import type { PlayerAnalysis } from '$lib/schemas/player-analysis';
import { playerImprovementFromGames } from '$lib/player-analysis/player-improvement';

export const analyzePlayer = query(
	z.object({ id: idField }),
	async ({ id }): Promise<PlayerAnalysis> => {
		const gameStats = await getPlayerGameStats({ playerId: id });
		const player = await db.query.player.findFirst({
			where: { id },
			columns: { id: true },
			with: {
				team: {
					columns: { id: true },
					with: { division: { columns: { seasonId: true } } },
				},
			},
		});
		return playerImprovementFromGames(gameStats, player?.team?.division?.seasonId);
	}
);
