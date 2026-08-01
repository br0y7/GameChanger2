import { z } from 'zod';
import { requiredName } from './common';

export const playerSchema = {
	...requiredName('Player name'),
	jerseyNumber: z
		.string()
		.trim()
		.regex(/^[0-9]{0,2}$/, 'Jersey number must be 1 or 2 digits (0 to 99)')
		.transform((value) => (value === '' ? undefined : value))
		.optional(),
};

export const createPlayerSchema = z.object({
	...playerSchema,
	teamId: z.uuid('Please select a team.'),
});

export type CreatePlayerInput = z.infer<typeof createPlayerSchema>;

export const updatePlayerSchema = z.object({
	...playerSchema,
	id: z.uuid().nonoptional('Player ID is required.'),
});

export type UpdatePlayerInput = z.infer<typeof updatePlayerSchema>;
