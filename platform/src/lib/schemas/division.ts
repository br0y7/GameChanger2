import { divisionFormLabels } from '$lib/forms/labels';
import { createNameSlugSchema, requiredId } from '$lib/schemas/common';
import { z } from 'zod';

export const divisionTypes = ['competitive', 'community', 'recreational'] as const;

export const divisionSchema = {
	...createNameSlugSchema({ labels: divisionFormLabels }),
	type: z.enum(divisionTypes, 'Division Type is required').default('community'),
	seasonId: z.uuid().nonoptional(),
};

export const createDivisionSchema = z.object({
	...divisionSchema,
});

export type CreateDivisionInput = z.infer<typeof createDivisionSchema>;

export const updateDivisionSchema = z.object({
	...divisionSchema,
	...requiredId,
});

export type UpdateDivisionInput = z.infer<typeof updateDivisionSchema>;
