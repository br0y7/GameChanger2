import { teamFormLabels } from '$lib/forms/labels';
import { refineNameSlugSchema } from '$lib/schemas/common';
import { team } from '$lib/server/db/schema';
import type { z } from 'better-auth';
import { createInsertSchema } from 'drizzle-orm/zod';

// Modify/extend the existing DB schema to customize the validation error messages.
export const createTeamSchema = createInsertSchema(team, {
	...refineNameSlugSchema(teamFormLabels),
});

export type TeamFormSchema = z.infer<typeof createTeamSchema>;

export const createTeamOrgSchema = createInsertSchema(team, {
	...refineNameSlugSchema(teamFormLabels),
	seasonId: (s) => s.optional(), // For solo coach flow where there is an implicit season
});

export type TeamOrgFormSchema = z.infer<typeof createTeamOrgSchema>;
