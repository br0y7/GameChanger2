import { seasonFormLabels } from '$lib/forms/labels';
import { createNameSlugSchema, requiredId } from './common';
import { z } from 'zod';

export const seasonStatuses = ['active', 'completed'] as const;

export const seasonSchema = {
	...createNameSlugSchema({ labels: seasonFormLabels }),
	status: z.enum(seasonStatuses, 'Season Status is required'),
};

export const createSeasonSchema = z.object({ ...seasonSchema });

export type CreateSeasonInput = z.infer<typeof createSeasonSchema>;

export const updateSeasonSchema = z.object({ ...seasonSchema, ...requiredId });

export type UpdateSeasonInput = z.infer<typeof updateSeasonSchema>;
