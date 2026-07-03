import { teamFormLabels } from '$lib/forms/labels';
import { createNameSlugSchema } from '$lib/schemas/common';
import { z } from 'zod';

const teamSchema = {
	...createNameSlugSchema({ ...teamFormLabels }),
};

export const createTeamSchema = z.object({
	...teamSchema,
	flow: z.enum(['standard', 'solo-coach']).default('standard'),
	divisionId: z.uuid().optional(),
});

export type CreateTeamInput = z.infer<typeof createTeamSchema>;
