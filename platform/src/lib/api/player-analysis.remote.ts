import { query } from '$app/server';
import { idField } from '$lib/schemas/common';
import { z } from 'zod';
import { getPlayerGameStats } from './player-game-stat.remote';
import { derivePlayerStats } from '$lib/stats/player-stats';
import type { PlayerAnalysis } from '$lib/schemas/player-analysis';
import { derivePlayerStrengths } from '$lib/player-analysis/player-strengths';
import { derivePlayerWeaknesses } from '$lib/player-analysis/player-weaknesses';

export const analyzePlayer = query(
	z.object({ id: idField }),
	async ({ id }): Promise<PlayerAnalysis> => {
		const gameStats = await getPlayerGameStats({ playerId: id });

		const stats = derivePlayerStats(gameStats);

		return {
			strengths: derivePlayerStrengths(stats),
			weaknesses: derivePlayerWeaknesses(stats),
		};
	}
);
