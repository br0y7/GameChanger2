import type { NameSlugSchemaOptions } from '$lib/schemas/common';

type NameSlugFormLabels = Required<NameSlugSchemaOptions>;

export const teamFormLabels: NameSlugFormLabels = {
	nameLabel: 'Team Name',
	slugLabel: 'Team Slug',
} as const;

export const leagueFormLabels: NameSlugFormLabels = {
	nameLabel: 'League Name',
	slugLabel: 'League Slug',
} as const;

export const seasonFormLabels: NameSlugFormLabels = {
	nameLabel: 'Season Name',
	slugLabel: 'Season Slug',
} as const;
