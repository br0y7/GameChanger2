import { resolve } from '$app/paths';
import { form, getRequestEvent, query } from '$app/server';
import { ORG_CREATOR_ROLES, type OnboardingOrgCreatorRole } from '$lib/onboarding/roles';
import { COACH_START_STEP, ORGANIZER_START_STEP } from '$lib/onboarding/steps';
import { idOnlySchema } from '$lib/schemas/common';
import { db } from '$lib/server/db';
import { internal } from '$lib/server/fail';
import { serverLogger } from '$lib/server/logger';
import { error, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { assertOnboardingExists } from './onboarding.server';
import * as table from '$lib/server/db/schema';

const roleSchema = z.object({
	role: z.enum(ORG_CREATOR_ROLES),
});

export const selectOrgCreatorRole = form(roleSchema, async ({ role }) => {
	const {
		locals: { onboarding, user },
	} = getRequestEvent();

	assertOnboardingExists(onboarding);

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
		.update(table.userOnboarding)
		.set({
			role,
			status: 'in_progress',
			currentStep,
		})
		.where(eq(table.userOnboarding.id, onboarding.id));

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

export const getOnboardingWithUser = query(idOnlySchema, async ({ id }) => {
	const onboarding = await db.query.userOnboarding.findFirst({ where: { userId: id } });

	assertOnboardingExists(onboarding);

	return onboarding;
});

export const completeOnboarding = form(idOnlySchema, async (data) => {
	const { onboarding } = getRequestEvent().locals;

	assertOnboardingExists(onboarding);

	if (onboarding.id != data.id) {
		internal(
			{ resource: 'user' },
			{ action: 'update', message: 'Passed id different than local onboarding id' }
		);
	}

	return onboarding;
});
