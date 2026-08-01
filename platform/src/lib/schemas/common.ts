import { z } from 'zod';

const CHAR_LIMIT = 100;

export interface NameSlugSchema {
	name: string;
	slug: string;
}

export interface NameSlugSchemaOptions {
	labels?: Partial<NameSlugSchema>;
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
	const { name = 'Name', slug = 'Slug' } = options?.labels ?? {};

	return {
		...requiredName(name),
		slug: z
			.string()
			.trim()
			.min(1, `${slug} is required`)
			// pipe only runs if the previous func (min) is valid
			// The benefit is only showing one error, as an empty string
			// triggers the regex below as well.
			.pipe(
				z
					.string()
					.max(CHAR_LIMIT, `${slug} must be ${CHAR_LIMIT} characters or less`)
					.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
						message: `${slug} must be lowercase letters, numbers, and hyphens only`,
					})
			),
	};
};

export const idField = z.uuid();

export const requiredId = {
	id: idField,
};

export const idOnlySchema = z.object({
	...requiredId,
});

export type IdOnlySchema = z.infer<typeof idOnlySchema>;
