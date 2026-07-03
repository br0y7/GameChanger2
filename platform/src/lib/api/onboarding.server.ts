import { ONBOARDING_DONE_STEP, type OnboardingStep } from '$lib/onboarding/steps';
import { db } from '$lib/server/db';
import { type Onboarding } from '$lib/server/db/schema';
import { internal } from '$lib/server/fail';
import { serverLogger } from '$lib/server/logger';
import { eq } from 'drizzle-orm';
import * as table from '$lib/server/db/schema';

/**
 * This shouldn't run, used only to narrow types.
 * @param onboarding
 */
export function assertOnboardingExists(
	onboarding?: Onboarding | null
): asserts onboarding is Onboarding {
	if (!onboarding) {
		internal(
			{ resource: 'user' },
			{
				action: 'read',
				message: 'This should not happen, check better auth user created db hook.',
			}
		);
	}
}

/**
 * Advances the currentStep of an Onboarding record using the stepMap.
 * @param onboarding Onboarding record
 * @param stepMap object/record found in `steps.ts` related to the `role`
 */
export async function advanceOnboardingStep<TStep extends OnboardingStep>(
	onboarding: Onboarding,
	stepMap: Record<TStep, TStep>
) {
	if (!onboarding.role) {
		internal(
			{ resource: 'user' },
			{ action: 'update', message: 'Tried advancing onboarding without a role.' }
		);
	}

	const currentStep = onboarding.currentStep as TStep;
	const nextOnboardingStep = stepMap[currentStep];

	if (!nextOnboardingStep) {
		internal(
			{ resource: 'user' },
			{
				action: 'update',
				message: `Invalid onboarding transition role: ${onboarding.role} ${currentStep}`,
			}
		);
	}

	const status: Onboarding['status'] =
		nextOnboardingStep === ONBOARDING_DONE_STEP ? 'complete' : 'in_progress';

	serverLogger.info(
		`${onboarding.role} onboarding | user: ${onboarding.userId} status: ${status} step: ${currentStep} -> ${nextOnboardingStep}`
	);

	await db
		.update(table.userOnboarding)
		.set({
			currentStep: nextOnboardingStep,
			status,
		})
		.where(eq(table.userOnboarding.id, onboarding.id));
}
