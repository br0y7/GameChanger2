import type { PlayerStats } from './player-stats';

export type RuleFor<T> = T & { applies: (stats: PlayerStats) => boolean };

export type PlayerAnalysisStat = {
	/** Short label like PPG, FG%, AST */
	label: string;
	/** Numeric value used for display formatting */
	value: number;
	/** Pre-formatted value for UI, e.g. "18.4" or "45%" */
	display: string;
};

export type PlayerStrength = {
	description: string;
	stat: PlayerAnalysisStat;
};

export type PlayerWeaknessCategory =
	| 'dribbling'
	| 'shooting'
	| 'free-throw-shooting'
	| 'three-point-shooting'
	| 'rebounding'
	| 'passing'
	| 'defense';

export type PlayerWeakness = {
	category: PlayerWeaknessCategory;
	description: string;
	stat: PlayerAnalysisStat;
};

export type PlayerAnalysis = {
	strengths: PlayerStrength[];
	weaknesses: PlayerWeakness[];
};
