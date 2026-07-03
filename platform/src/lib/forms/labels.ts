import type { NameSlugSchema } from '$lib/schemas/common';

export const teamFormLabels = {
	name: 'Team Name',
	slug: 'Team Slug',
} as const satisfies NameSlugSchema;

export const leagueFormLabels = {
	name: 'League Name',
	slug: 'League Slug',
} as const satisfies NameSlugSchema;

export const seasonFormLabels = {
	name: 'Season Name',
	slug: 'Season Slug',
} as const satisfies NameSlugSchema;
