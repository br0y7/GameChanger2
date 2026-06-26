import { z } from 'zod';
import { createInsertSchema } from 'drizzle-orm/zod';
import { player } from '$lib/server/db/schema';

// Modify/extend the existing DB schema to customize the validation error messages.
export const createPlayerSchema = createInsertSchema(player, {
	teamId: () => z.uuid('Please select a team.'),
	jerseyNumber: () =>
		z.preprocess(
			(val: string | null | undefined) => {
				const trimmed = val?.trim();

				// If the input is an empty string, the regex will test it.
				// By setting it to null the regex test will not run.
				return !trimmed ? null : trimmed;
			},
			z
				.string()
				.regex(/^[0-9]{1,2}$/, 'Jersey number must be 1 or 2 digits (0 to 99)')
				.nullable()
				.optional()
		),
	name: (name) =>
		name
			.trim()
			.min(1, 'Player name is required')
			.max(50, 'Player name must be less than 50 characters.'),
});

export type PlayerFormSchema = z.infer<typeof createPlayerSchema>;
