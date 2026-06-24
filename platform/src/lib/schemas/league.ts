import type { z } from 'better-auth';
import { refineNameSlugSchema, type NameSlugSchemaOptions } from './common';
import { organization } from '$lib/server/db/auth-schema';
import { createInsertSchema } from 'drizzle-orm/zod';

const labels: NameSlugSchemaOptions = {
	nameLabel: 'League Name',
	slugLabel: 'League Slug',
};

// These functions just modify/extend the existing DB schema to customize the
// validation error messages
export const createLeagueSchema = createInsertSchema(
	organization,
	refineNameSlugSchema(labels)
).pick({
	name: true,
	slug: true,
});

export type LeagueFormSchema = z.infer<typeof createLeagueSchema>;
