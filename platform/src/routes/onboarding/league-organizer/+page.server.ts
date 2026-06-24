import { auth } from '$lib/server/auth.js';
import { organization } from '$lib/server/db/auth-schema.js';
import { db } from '$lib/server/db/index.js';
import { serverLogger } from '$lib/server/logger.js';
import { redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types.js';
import { resolve } from '$app/paths';
import { season, userOnboarding, type Onboarding } from '$lib/server/db/schema';
import { APIError } from 'better-auth';
import { createLeagueSchema, type LeagueFormSchema } from '$lib/schemas/league';
import { createSeasonSchema } from '$lib/schemas/season';
import {
	NEXT_ORGANIZER_ONBOARDING_STEP,
	type OrganizerOnboardingStep,
} from '$lib/onboarding/steps.js';
import { isValidOnboarding } from '$lib/server/guards.js';
import { internal, parseError, unauthorized, validationError } from '$lib/server/fail.js';

export const load: PageServerLoad = async ({ locals }) => {
	if (!isValidOnboarding('organizer', locals.onboarding)) {
		redirect(303, resolve('/onboarding'));
	}
};

async function advanceOnboardingStep(onboarding: Onboarding) {
	const currentStep = onboarding.currentStep as OrganizerOnboardingStep;
	const nextOnboardingStep = NEXT_ORGANIZER_ONBOARDING_STEP[currentStep];
	const status: Onboarding['status'] = nextOnboardingStep === 'done' ? 'complete' : 'in_progress';

	serverLogger.info(
		`Organizer Onboarding | USER: ${onboarding.userId} STATUS: ${status} STEP: ${currentStep} -> ${nextOnboardingStep}`
	);

	await db
		.update(userOnboarding)
		.set({
			currentStep: nextOnboardingStep,
			status,
		})
		.where(eq(userOnboarding.id, onboarding.id));
}

export const actions = {
	createLeague: async ({ request, locals }) => {
		const { onboarding } = locals;

		if (!onboarding) {
			// this shouldn't run, for defensive and type-safety only
			return internal();
		}

		const data = await request.formData();

		const parsed = createLeagueSchema.safeParse(Object.fromEntries(data));

		if (!parsed.success) {
			return parseError(parsed.error);
		}

		try {
			const league = await auth.api.createOrganization({
				headers: request.headers,
				body: {
					...parsed.data,
				},
			});

			await db.update(organization).set({ type: 'league' }).where(eq(organization.id, league.id));

			await auth.api.setActiveOrganization({
				body: {
					organizationId: league.id,
				},
				headers: request.headers,
			});

			serverLogger.info(`League created ID: ${league.id}`);

			await advanceOnboardingStep(onboarding);

			return {
				data: {
					id: league.id,
				},
			};
		} catch (err) {
			if (err instanceof APIError && err.body) {
				serverLogger.error(err, err.body);

				const { $ERROR_CODES } = auth;

				switch (err.body.code) {
					case $ERROR_CODES.ORGANIZATION_ALREADY_EXISTS.code:
					case $ERROR_CODES.ORGANIZATION_SLUG_ALREADY_TAKEN.code:
						return validationError<LeagueFormSchema>({
							slug: [
								`The slug '${parsed.data.slug}' is already taken. Please use a different one.`,
							],
						});
					case $ERROR_CODES.YOU_ARE_NOT_ALLOWED_TO_CREATE_A_NEW_ORGANIZATION.code:
					case $ERROR_CODES.YOU_HAVE_REACHED_THE_MAXIMUM_NUMBER_OF_ORGANIZATIONS.code:
						return internal('You are not allowed to make a league.');
				}
			}

			serverLogger.error(err);
			return internal();
		}
	},
	createSeason: async ({ request, locals }) => {
		const { session, onboarding } = locals;

		if (!onboarding) {
			// this shouldn't run, for defensive and type-safety only
			return internal();
		}

		const data = await request.formData();

		const parsed = createSeasonSchema.safeParse(Object.fromEntries(data));

		if (!parsed.success) {
			return parseError(parsed.error);
		}

		try {
			if (!session?.activeOrganizationId) {
				serverLogger.error('Tried creating a season but no active organization.');
				return unauthorized();
			}

			const [created] = await db
				.insert(season)
				.values({
					...parsed.data,
					organizationId: session.activeOrganizationId,
				})
				.returning({ id: season.id });

			await advanceOnboardingStep(onboarding);

			serverLogger.info(`Season created ID: ${created.id}`);

			return { data: { id: created.id } };
		} catch (err) {
			serverLogger.error(err);
			return internal();
		}
	},
} satisfies Actions;
