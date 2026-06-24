import { refineNameSlugSchema, type NameSlugSchemaOptions } from '$lib/schemas/common';
import { season } from '$lib/server/db/schema';
import type { z } from 'better-auth';
import { createInsertSchema } from 'drizzle-orm/zod';

const labels: NameSlugSchemaOptions = {
	nameLabel: 'Season Name',
	slugLabel: 'Season Slug',
};

// Modify/extend the existing DB schema to customize the validation error messages.
export const createSeasonSchema = createInsertSchema(season, {
	...refineNameSlugSchema(labels),
	organizationId: (s) => s.optional(), // the server should set this, not form submissions
});

export type SeasonFormSchema = z.infer<typeof createSeasonSchema>;
