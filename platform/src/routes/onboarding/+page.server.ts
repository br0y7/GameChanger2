import { resolve } from '$app/paths';
import { ORG_CREATOR_ROLES, type OnboardingOrgCreatorRole } from '$lib/onboarding/roles';
import { db } from '$lib/server/db/index.js';
import { userOnboarding } from '$lib/server/db/schema.js';
import { serverLogger } from '$lib/server/logger.js';
import { error, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const roleSchema = z.object({
	role: z.enum(ORG_CREATOR_ROLES),
});

export const actions = {
	default: async ({ request, locals }) => {
		const data = await request.formData();

		const parsed = roleSchema.safeParse(Object.fromEntries(data));

		if (!parsed.success || !parsed.data) {
			serverLogger.error('Invalid data passed in /onboarding', parsed.error, parsed.data);
			return error(500, 'Onboarding Error');
		}

		const { role } = parsed.data;
		const { onboarding } = locals;

		// This shouldn't happen, but just in case (defensive)
		if (!onboarding) {
			serverLogger.error(
				'Hit /onboarding/+page.server.ts with no onboarding',
				parsed.error,
				parsed.data
			);
			return error(500, 'No onboarding on /onboarding/+page.server.ts');
		}

		await db
			.update(userOnboarding)
			.set({
				role,
				status: 'in_progress',
			})
			.where(eq(userOnboarding.id, onboarding.id));

		serverLogger.info(`User ID: ${locals.user?.id} started onboarding`);

		switch (role) {
			case 'organizer':
				return redirect(303, resolve('/onboarding/league-organizer'));
			case 'coach':
				return redirect(303, resolve('/onboarding/coach'));
			default:
				// For type safety, won't run unless you add a role
				// and not add a case for it (not addressing the `satisfies` error)
				return error(500, `${role satisfies OnboardingOrgCreatorRole[]}`);
		}
	},
};
