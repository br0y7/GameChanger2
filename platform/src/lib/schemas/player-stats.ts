import type { DerivedStatKey, RawStatKey } from './player-game-stat';

export type Statistic = {
	total: number;
	average?: number;
	min?: number;
	max?: number;
};

export type PlayerStats = {
	raw: Record<RawStatKey, Statistic>;
	derived: {
		[K in DerivedStatKey]: Statistic;
	};
};
