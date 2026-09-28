import { teamFormLabels } from '$lib/forms/labels';
import { createNameSlugSchema, requiredId, requiredName } from '$lib/schemas/common';
import { z } from 'zod';

export const teamSchema = {
	...createNameSlugSchema({ labels: teamFormLabels }),
};

export const createTeamSchema = z.object({
	...teamSchema,
	flow: z.enum(['standard', 'solo-coach']).default('standard'),
	divisionId: z.uuid().optional(),
});

export type CreateTeamInput = z.infer<typeof createTeamSchema>;

export const updateTeamSchema = z.object({
	...teamSchema,
	...requiredId,
	divisionId: z.uuid().nonoptional(),
});

export type UpdateTeamInput = z.infer<typeof updateTeamSchema>;

export const renameTeamSchema = z.object({
	...requiredName('Team name'),
	id: z.uuid().nonoptional('Team ID is required.'),
});

export type RenameTeamInput = z.infer<typeof renameTeamSchema>;
