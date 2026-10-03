import { derivePlayerStats } from '$lib/stats/player-stats';
import { derivePlayerStrengths } from '$lib/player-analysis/player-strengths';
import { derivePlayerWeaknesses } from '$lib/player-analysis/player-weaknesses';
import { dedupeByMatchup } from '$lib/stats/matchup';
import type { PlayerGameStats, WithGame } from '$lib/schemas/player-game-stat';
import type { PlayerAnalysis } from '$lib/schemas/player-analysis';

/** Same strengths, focus areas, and drill category on player and coach views. */
export function playerImprovementFromGames(
	gameStats: WithGame<PlayerGameStats>[]
): PlayerAnalysis {
	const stats = derivePlayerStats(dedupeByMatchup(gameStats, (stat) => stat.game));
	return {
		strengths: derivePlayerStrengths(stats),
		weaknesses: derivePlayerWeaknesses(stats),
	};
}
