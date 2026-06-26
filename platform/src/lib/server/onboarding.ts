import { eq } from 'drizzle-orm';
import { db } from './db';
import { userOnboarding, type Onboarding } from './db/schema';
import { serverLogger } from './logger';

/**
 * Advances the currentStep of an Onboarding record using the stepMap.
 * @param onboarding Onboarding record
 * @param role Onboarding role
 * @param stepMap object/record found in `steps.ts` related to the `role`
 */
export async function advanceOnboardingStep<OnboardingStep extends string>(
	onboarding: Onboarding,
	role: NonNullable<Onboarding['role']>,
	stepMap: Record<OnboardingStep, OnboardingStep>
) {
	const currentStep = onboarding.currentStep as OnboardingStep;
	const nextOnboardingStep = stepMap[currentStep];
	const status: Onboarding['status'] = nextOnboardingStep === 'done' ? 'complete' : 'in_progress';

	serverLogger.info(
		`${role} onboarding | user: ${onboarding.userId} status: ${status} step: ${currentStep} -> ${nextOnboardingStep}`
	);

	await db
		.update(userOnboarding)
		.set({
			currentStep: nextOnboardingStep,
			status,
		})
		.where(eq(userOnboarding.id, onboarding.id));
}
