import type { PlayerStats } from './player-stats';

export type RuleFor<T> = T & { applies: (stats: PlayerStats) => boolean };

export type PlayerStrength = {
	description: string;
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
};

export type PlayerAnalysis = {
	strengths: PlayerStrength[];
	weaknesses: PlayerWeakness[];
};
