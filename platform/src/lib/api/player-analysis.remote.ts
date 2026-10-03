import { query } from '$app/server';
import { idField } from '$lib/schemas/common';
import { z } from 'zod';
import { getPlayerGameStats } from './player-game-stat.remote';
import type { PlayerAnalysis } from '$lib/schemas/player-analysis';
import { playerImprovementFromGames } from '$lib/player-analysis/player-improvement';

export const analyzePlayer = query(
	z.object({ id: idField }),
	async ({ id }): Promise<PlayerAnalysis> => {
		const gameStats = await getPlayerGameStats({ playerId: id });
		return playerImprovementFromGames(gameStats);
	}
);
