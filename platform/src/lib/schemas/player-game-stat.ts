import type { Game, RawPlayerGameStats } from '$lib/server/db/schema';

export const rawStatKeys = [
	'fgm',
	'fga',
	'fg3m',
	'fg3a',
	'ftm',
	'fta',
	'oreb',
	'dreb',
	'ast',
	'stl',
	'blk',
	'tov',
	'pf',
] as const;

export type RawStatKey = (typeof rawStatKeys)[number];

export const derivedStatKeys = ['pts', 'fgPct', 'fg3Pct', 'ftPct', 'reb', 'eff'] as const;

export type DerivedStatKey = (typeof derivedStatKeys)[number];

export type PlayerGameStats = RawPlayerGameStats & {
	[K in DerivedStatKey]: number;
};

export type WithGame<T> = T & { game?: Game | null };
