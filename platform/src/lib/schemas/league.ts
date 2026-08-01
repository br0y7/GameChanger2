import { leagueFormLabels } from '$lib/forms/labels';
import { createNameSlugSchema, requiredId } from './common';
import { z } from 'zod';

const leagueSchema = {
	...createNameSlugSchema({ labels: leagueFormLabels }),
};

export const createLeagueSchema = z.object({ ...leagueSchema });

export type CreateLeagueInput = z.infer<typeof createLeagueSchema>;

export const updateLeagueSchema = z.object({ ...leagueSchema, ...requiredId });

export type UpdateLeagueInput = z.infer<typeof updateLeagueSchema>;
