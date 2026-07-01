import { resolve } from '$app/paths';
import { form, getRequestEvent } from '$app/server';
import { ORG_CREATOR_ROLES, type OnboardingOrgCreatorRole } from '$lib/onboarding/roles';
import { COACH_START_STEP, ORGANIZER_START_STEP } from '$lib/onboarding/steps';
import { db } from '$lib/server/db';
import { userOnboarding } from '$lib/server/db/schema';
import { serverLogger } from '$lib/server/logger';
import { error, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const roleSchema = z.object({
	role: z.enum(ORG_CREATOR_ROLES),
});

export const selectOrgCreatorRole = form(roleSchema, async ({ role }) => {
	const {
		locals: { onboarding, user },
	} = getRequestEvent();

	// This shouldn't happen, but just in case (defensive)
	if (!onboarding) {
		serverLogger.error('Hit /onboarding/+page.server.ts with no onboarding', role);
		error(500, 'No onboarding on /onboarding/+page.server.ts');
	}

	let currentStep;

	switch (role) {
		case 'organizer':
			currentStep = ORGANIZER_START_STEP;
			break;
		case 'coach':
			currentStep = COACH_START_STEP;
			break;
		default:
			// For type safety only, 'satisfies' will error if you don't code each case.
			return error(500, `${role satisfies OnboardingOrgCreatorRole[]}`);
	}

	await db
		.update(userOnboarding)
		.set({
			role,
			status: 'in_progress',
			currentStep,
		})
		.where(eq(userOnboarding.id, onboarding.id));

	serverLogger.info(`user: ${user?.id} started onboarding`);

	switch (role) {
		case 'organizer':
			return redirect(303, resolve('/onboarding/league-organizer'));
		case 'coach':
			return redirect(303, resolve('/onboarding/coach'));
		default:
			// For type safety only, 'satisfies' will error if you don't code each case.
			return error(500, `${role satisfies OnboardingOrgCreatorRole[]}`);
	}
});
