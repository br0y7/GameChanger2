export type DrillDifficulty = 'beginner' | 'intermediate' | 'advanced';

export type BasketballDrill = {
	name: string;
	difficulty: DrillDifficulty;
	description: string;
	duration: string;
	instructions: string[];
	keyPoints: string;
};
