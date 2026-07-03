import { z } from 'zod';

const CHAR_LIMIT = 100;

export interface NameSlugSchemaOptions {
	nameLabel?: string;
	slugLabel?: string;
	characterLimit?: number;
}

export const requiredName = (label: string, characterLimit = CHAR_LIMIT) => {
	if (characterLimit <= 0) {
		throw new Error('Character limit must be greater than 0');
	}

	return {
		name: z
			.string()
			.trim()
			.min(1, `${label} is required`)
			.max(characterLimit, `${label} must be ${characterLimit} characters or less`),
	};
};

export const createNameSlugSchema = (options?: NameSlugSchemaOptions) => {
	const nameLabel = options?.nameLabel ?? 'Name';
	const slugLabel = options?.slugLabel ?? 'Slug';

	return {
		...requiredName(nameLabel),
		slug: z
			.string()
			.trim()
			.min(1, `${slugLabel} is required`)
			// pipe only runs if the previous func (min) is valid
			// The benefit is only showing one error, as an empty string
			// triggers the regex below as well.
			.pipe(
				z
					.string()
					.max(CHAR_LIMIT, `${slugLabel} must be ${CHAR_LIMIT} characters or less`)
					.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
						message: `${slugLabel} must be lowercase letters, numbers, and hyphens only`,
					})
			),
	};
};

export const requiredId = {
	id: z.uuid().nonoptional(),
};

export const idOnlySchema = z.object({
	...requiredId,
});

export type IdOnlySchema = z.infer<typeof idOnlySchema>;
