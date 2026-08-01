import type { NameSlugSchema } from '$lib/schemas/common';

export const teamFormLabels = {
	name: 'Team Name',
	slug: 'Team Slug',
} as const satisfies NameSlugSchema;

export const leagueFormLabels = {
	name: 'League Name',
	slug: 'League Slug',
} as const satisfies NameSlugSchema;

type SeasonFormLabels = NameSlugSchema & {
	status: string;
};

export const seasonFormLabels = {
	name: 'Season Name',
	slug: 'Season Slug',
	status: 'Season Status',
} as const satisfies SeasonFormLabels;

export const divisionFormLabels = {
	name: 'Division Name',
	slug: 'Division Slug',
} as const satisfies NameSlugSchema;
