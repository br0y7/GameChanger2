import { auth } from '$lib/server/auth.js';
import { organization } from '$lib/server/db/auth-schema.js';
import { db } from '$lib/server/db/index.js';
import { serverLogger } from '$lib/server/logger.js';
import { isActionFailure, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types.js';
import { resolve } from '$app/paths';
import { season } from '$lib/server/db/schema';
import { createLeagueSchema } from '$lib/schemas/league';
import { createSeasonSchema } from '$lib/schemas/season';
import { NEXT_ORGANIZER_ONBOARDING_STEP } from '$lib/onboarding/steps.js';
import { isValidOnboarding } from '$lib/server/guards.js';
import { internal, parseError, unauthorized } from '$lib/server/fail.js';
import { advanceOnboardingStep, handleOrgAPIError } from '$lib/server/onboarding';

export const load: PageServerLoad = async ({ locals }) => {
	if (!isValidOnboarding('organizer', locals.onboarding)) {
		redirect(303, resolve('/onboarding'));
	}
};

export const actions = {
	createLeague: async ({ request, locals }) => {
		const { onboarding } = locals;

		if (!onboarding) {
			// this shouldn't run, for defensive and type-safety only
			return internal({ resource: 'league' });
		}

		const data = await request.formData();

		const parsed = createLeagueSchema.safeParse(Object.fromEntries(data));

		if (!parsed.success) {
			return parseError(parsed.error, { resource: 'league' });
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

			await advanceOnboardingStep(onboarding, 'organizer', NEXT_ORGANIZER_ONBOARDING_STEP);

			return {
				data: {
					id: league.id,
				},
			};
		} catch (err) {
			const failure = handleOrgAPIError(err, 'league');

			if (isActionFailure(failure)) {
				return failure;
			}

			serverLogger.error(err);
			return internal({ resource: 'league' });
		}
	},
	createSeason: async ({ request, locals }) => {
		const { session, onboarding } = locals;

		if (!onboarding) {
			// this shouldn't run, for defensive and type-safety only
			return internal({ resource: 'season' });
		}

		const data = await request.formData();

		const parsed = createSeasonSchema.safeParse(Object.fromEntries(data));

		if (!parsed.success) {
			return parseError(parsed.error, { resource: 'season' });
		}

		try {
			if (!session?.activeOrganizationId) {
				serverLogger.error('Tried creating a season but no active organization.');
				return unauthorized({ resource: 'season' });
			}

			const [created] = await db
				.insert(season)
				.values({
					...parsed.data,
					organizationId: session.activeOrganizationId,
				})
				.returning({ id: season.id });

			await advanceOnboardingStep(onboarding, 'organizer', NEXT_ORGANIZER_ONBOARDING_STEP);

			serverLogger.info(`Season created ID: ${created.id}`);

			return { data: { id: created.id } };
		} catch (err) {
			serverLogger.error(err);
			return internal({ resource: 'season' });
		}
	},
} satisfies Actions;
