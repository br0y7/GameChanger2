import { leagueFormLabels } from '$lib/forms/labels';
import { createNameSlugSchema, idField, requiredId } from './common';
import { z } from 'zod';

const leagueSchema = {
	...createNameSlugSchema({ labels: leagueFormLabels }),
};

export const createLeagueSchema = z.object({ ...leagueSchema });

export type CreateLeagueInput = z.infer<typeof createLeagueSchema>;

export const updateLeagueSchema = z.object({ ...leagueSchema, ...requiredId });

export type UpdateLeagueInput = z.infer<typeof updateLeagueSchema>;

const LOGO_MIME = ['image/png', 'image/webp', 'image/jpeg'] as const;
const LOGO_MAX_BYTES = 2 * 1024 * 1024;

export const uploadLeagueLogoSchema = z.object({
	organizationId: idField,
	/** PNG / WebP preferred for crisp logos; JPEG allowed. */
	logo: z.custom<File>(
		(data) => {
			const file = data as File | undefined;
			if (!file || typeof file !== 'object' || typeof file.size !== 'number') return false;
			if (file.size <= 0 || file.size > LOGO_MAX_BYTES) return false;
			return (LOGO_MIME as readonly string[]).includes(file.type);
		},
		'Upload a PNG, WebP, or JPEG logo under 2MB'
	),
});

export const clearLeagueLogoSchema = z.object({
	organizationId: idField,
});
