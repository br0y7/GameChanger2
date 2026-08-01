import {
	derivedStatKeys,
	rawStatKeys,
	type DerivedStatKey,
	type PlayerGameStats,
	type RawStatKey,
} from '$lib/schemas/player-game-stat';
import type { PlayerStats, Statistic } from '$lib/schemas/player-stats';
import { averageBy, maxBy, minBy, sumBy } from '$lib/utils/collection';

/**
 * Returns the aggregate player stats from a list of game stats.
 * @param gameStats List of player game stats
 * @returns Player Stats
 */
export const derivePlayerStats = (gameStats: PlayerGameStats[]): PlayerStats => ({
	raw: rawStatKeys.reduce(
		(obj, key) => {
			obj[key] = {
				total: sumBy(gameStats, (stats) => stats[key]),
				average: averageBy(gameStats, (stats) => stats[key]),
				min: minBy(gameStats, (stats) => stats[key]),
				max: maxBy(gameStats, (stats) => stats[key]),
			};
			return obj;
		},
		{} as Record<RawStatKey, Statistic>
	),
	derived: derivedStatKeys.reduce(
		(obj, key) => {
			obj[key] = {
				total: sumBy(gameStats, (stats) => stats[key]),
				average: averageBy(gameStats, (stats) => stats[key]),
				min: minBy(gameStats, (stats) => stats[key]),
				max: maxBy(gameStats, (stats) => stats[key]),
			};
			return obj;
		},
		{} as Record<DerivedStatKey, Statistic>
	),
});
