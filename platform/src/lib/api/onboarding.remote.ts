import { resolve } from '$app/paths';
import { form, query } from '$app/server';
import { ORG_CREATOR_ROLES, type OnboardingOrgCreatorRole } from '$lib/onboarding/roles';
import {
	COACH_START_STEP,
	ONBOARDING_DONE_STEP,
	ORGANIZER_START_STEP,
} from '$lib/onboarding/steps';
import { idField } from '$lib/schemas/common';
import { db } from '$lib/server/db';
import { serverLogger } from '$lib/server/logger';
import { redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { assertOnboardingExists } from './onboarding.server';
import * as table from '$lib/server/db/schema';
import { requireUser } from './auth.remote';

export const getOnboarding = query(
	z.object({
		userId: idField,
	}),
	async ({ userId }) => {
		const onboarding = await db.query.userOnboarding.findFirst({ where: { userId } });

		assertOnboardingExists(onboarding);

		return onboarding;
	}
);

export const selectOrgCreatorRole = form(
	z.object({
		role: z.enum(ORG_CREATOR_ROLES),
	}),
	async ({ role }) => {
		const user = await requireUser();
		const onboarding = await getOnboarding({ userId: user.id });

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
				return `${role satisfies OnboardingOrgCreatorRole[]}`;
		}

		await db
			.update(table.userOnboarding)
			.set({
				role,
				status: 'in_progress',
				currentStep,
			})
			.where(eq(table.userOnboarding.id, onboarding.id));

		void getOnboarding({ userId: user.id }).refresh();

		serverLogger.info('started onboarding', { userId: user.id });

		switch (role) {
			case 'organizer':
				return redirect(303, resolve('/onboarding/league-organizer'));
			case 'coach':
				return redirect(303, resolve('/onboarding/coach'));
			default:
				// For type safety only, 'satisfies' will error if you don't code each case.
				return `${role satisfies OnboardingOrgCreatorRole[]}`;
		}
	}
);

export const completeOnboarding = form('unchecked', async () => {
	const { id: userId } = await requireUser();
	const onboarding = await getOnboarding({ userId });

	await db
		.update(table.userOnboarding)
		.set({
			currentStep: ONBOARDING_DONE_STEP,
			status: 'complete',
		})
		.where(eq(table.userOnboarding.id, onboarding.id));

	// void -> no need to wait for this
	void getOnboarding({ userId }).refresh();

	redirect(303, resolve('/dashboard'));
});
