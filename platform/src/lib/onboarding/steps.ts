export const ONBOARDING_DEFAULT_STEP = 'not-started';

const DONE_STEP = 'done';

export const ORGANIZER_STEPS = [
	'create-league',
	'create-season',
	'setup-league',
	DONE_STEP,
] as const;

export const ORGANIZER_START_STEP = ORGANIZER_STEPS[0];

export const COACH_STEPS = ['create-team', 'create-season', 'invite-players', DONE_STEP] as const;

export const COACH_START_STEP = COACH_STEPS[0];
