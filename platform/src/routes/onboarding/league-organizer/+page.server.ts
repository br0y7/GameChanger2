import { auth } from '$lib/server/auth.js';
import { organization } from '$lib/server/db/auth-schema.js';
import { db } from '$lib/server/db/index.js';
import { serverLogger } from '$lib/server/logger.js';
import { fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import type { Actions, PageServerLoad } from './$types.js';
import { resolve } from '$app/paths';
import { season, userOnboarding, type Onboarding } from '$lib/server/db/schema';
import { APIError } from 'better-auth';
import { createLeagueSchema } from '$lib/schemas/league';
import { createSeasonSchema } from '$lib/schemas/season';
import {
	NEXT_ORGANIZER_ONBOARDING_STEP,
	type OrganizerOnboardingStep,
} from '$lib/onboarding/steps.js';
import { isValidOnboarding } from '$lib/server/guards.js';

export const load: PageServerLoad = async ({ locals }) => {
	if (!isValidOnboarding('organizer', locals.onboarding)) {
		redirect(303, resolve('/onboarding'));
	}
};

async function advanceOnboardingStep(onboarding: Onboarding) {
	const currentStep = onboarding.currentStep as OrganizerOnboardingStep;
	const nextOnboardingStep = NEXT_ORGANIZER_ONBOARDING_STEP[currentStep];

	serverLogger.info(`Organizer onboarding FROM: ${currentStep} TO: ${nextOnboardingStep}`);

	await db
		.update(userOnboarding)
		.set({
			currentStep: nextOnboardingStep,
		})
		.where(eq(userOnboarding.id, onboarding.id));
}

export const actions = {
	createLeague: async ({ request, locals }) => {
		const { onboarding } = locals;

		if (!onboarding) {
			// this shouldn't run, for defensive and type-safety only
			return fail(400, { error: { message: 'Something went wrong' } });
		}

		const data = await request.formData();

		const parsed = await createLeagueSchema.safeParseAsync(Object.fromEntries(data));

		if (!parsed.success) {
			return fail(400, {
				errors: z.flattenError(parsed.error).fieldErrors,
			});
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

			serverLogger.info(`Created league, id: ${league.id}`);

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
						return fail(400, {
							errors: {
								slug: [
									`The slug '${parsed.data.slug}' is already taken. Please use a different one.`,
								],
							},
						});
					case $ERROR_CODES.YOU_ARE_NOT_ALLOWED_TO_CREATE_A_NEW_ORGANIZATION.code:
					case $ERROR_CODES.YOU_HAVE_REACHED_THE_MAXIMUM_NUMBER_OF_ORGANIZATIONS.code:
						return fail(403, {
							error: {
								message: err.body.message,
							},
						});
				}
			}

			serverLogger.error(err);
			return fail(500, {
				error: { message: 'Something went wrong.' },
			});
		}
	},
	createSeason: async ({ request, locals }) => {
		const { session, onboarding } = locals;

		if (!onboarding) {
			// this shouldn't run, for defensive and type-safety only
			return fail(400, { error: { message: 'Something went wrong' } });
		}

		const data = await request.formData();

		const parsed = createSeasonSchema.safeParse(Object.fromEntries(data));

		if (!parsed.success) {
			return fail(400, {
				errors: z.flattenError(parsed.error).fieldErrors,
			});
		}

		try {
			if (!session?.activeOrganizationId) {
				serverLogger.error('Tried creating a season but no active organization.');
				return fail(401, {
					error: { message: 'Unauthorized.' },
				});
			}

			const [created] = await db
				.insert(season)
				.values({
					...parsed.data,
					organizationId: session.activeOrganizationId,
				})
				.returning({ id: season.id });

			await advanceOnboardingStep(onboarding);

			return { data: { id: created.id } };
		} catch (err) {
			serverLogger.error(err);
			return fail(500, {
				error: { message: 'Something went wrong.' },
			});
		}
	},
} satisfies Actions;
