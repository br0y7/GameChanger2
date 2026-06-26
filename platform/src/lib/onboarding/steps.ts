export const ONBOARDING_DEFAULT_STEP = 'not-started';

const DONE_STEP = 'done';

export const ORGANIZER_STEPS = [
	'create-league',
	'create-season',
	'setup-league',
	DONE_STEP,
] as const;

export const ORGANIZER_START_STEP = ORGANIZER_STEPS[0];

export type OrganizerOnboardingStep = (typeof ORGANIZER_STEPS)[number];

export const NEXT_ORGANIZER_ONBOARDING_STEP: Record<
	OrganizerOnboardingStep,
	OrganizerOnboardingStep
> = {
	'create-league': 'create-season',
	'create-season': 'setup-league',
	'setup-league': DONE_STEP,
	[DONE_STEP]: DONE_STEP,
};

export const COACH_STEPS = ['create-team', 'add-players', DONE_STEP] as const;

export const COACH_START_STEP = COACH_STEPS[0];

export type CoachOnboardingStep = (typeof COACH_STEPS)[number];

export const NEXT_COACH_ONBOARDING_STEP: Record<CoachOnboardingStep, CoachOnboardingStep> = {
	'create-team': 'add-players',
	'add-players': DONE_STEP,
	[DONE_STEP]: DONE_STEP,
};
