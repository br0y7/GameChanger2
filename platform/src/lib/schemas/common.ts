import { ZodString, z } from 'zod';

export interface NameSlugSchemaOptions {
	nameLabel?: string;
	slugLabel?: string;
}

export const refineNameSlugSchema = (options?: NameSlugSchemaOptions) => {
	const nameLabel = options?.nameLabel ?? 'Name';
	const slugLabel = options?.slugLabel ?? 'Slug';

	return {
		name: (schema: ZodString) =>
			schema
				.trim()
				.min(1, `${nameLabel} is required`)
				.max(50, `${nameLabel} must be 50 characters or less`),
		slug: (schema: ZodString) =>
			schema
				.trim()
				.min(1, `${slugLabel} is required`)
				.max(50, `${slugLabel} must be 50 characters or less`)
				.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
					message: `${slugLabel} must be lowercase letters, numbers, and hyphens only`,
				}),
	};
};

export const idOnlySchema = z.object({
	id: z.uuid().nonoptional(),
});
