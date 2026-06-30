import { eq } from 'drizzle-orm';
import { db } from './db';
import { userOnboarding, type Onboarding } from './db/schema';
import { serverLogger } from './logger';
import { APIError } from 'better-auth/api';
import { auth } from './auth';
import type { Resource } from '$lib/forms/types';
import { forbidden, validationError } from './fail';

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

export function handleOrgAPIError<TSchema extends { slug: string }>(
	err: unknown,
	resource: Resource
) {
	if (err instanceof APIError && err.body) {
		serverLogger.error(err, err.body);

		const { $ERROR_CODES } = auth;

		switch (err.body.code) {
			case $ERROR_CODES.ORGANIZATION_ALREADY_EXISTS.code:
			case $ERROR_CODES.ORGANIZATION_SLUG_ALREADY_TAKEN.code:
				return validationError<TSchema>(
					{ slug: [`The slug is already taken. Please use a different one.`] },
					{ resource }
				);
			case $ERROR_CODES.YOU_ARE_NOT_ALLOWED_TO_CREATE_A_NEW_ORGANIZATION.code:
			case $ERROR_CODES.YOU_HAVE_REACHED_THE_MAXIMUM_NUMBER_OF_ORGANIZATIONS.code:
				return forbidden({ resource }, { message: `You are not allowed to make a ${resource}.` });
		}
	}
}
