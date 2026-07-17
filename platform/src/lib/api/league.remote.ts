import { form, getRequestEvent, query } from '$app/server';
import { createLeagueSchema, updateLeagueSchema } from '$lib/schemas/league';
import { auth } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { requireSession, requireUser } from './auth.remote';
import { eq } from 'drizzle-orm';
import { serverLogger } from '$lib/server/logger';
import { advanceOnboardingStep } from './onboarding.server';
import { getOnboarding } from './onboarding.remote';
import { isAPIError } from 'better-auth/api';
import { invalid } from '@sveltejs/kit';
import { NEXT_ORGANIZER_ONBOARDING_STEP } from '$lib/onboarding/steps';
import * as table from '$lib/server/db/schema';
import { leagueFormLabels } from '$lib/forms/labels';
import { getOrganization, isUserOrgAdmin } from './organization.remote';
import { forbidden } from '$lib/server/fail';

export const createLeague = form(createLeagueSchema, async (data, issue) => {
	const user = await requireUser();
	const onboarding = await getOnboarding({ userId: user.id });

	const {
		request: { headers },
	} = getRequestEvent();
	try {
		const league = await auth.api.createOrganization({
			headers,
			body: { ...data },
		});

		await db
			.update(table.organization)
			.set({ type: 'league' })
			.where(eq(table.organization.id, league.id));

		await auth.api.setActiveOrganization({
			headers,
			body: { organizationId: league.id },
		});

		serverLogger.info('league created', league.id);

		await advanceOnboardingStep(onboarding, NEXT_ORGANIZER_ONBOARDING_STEP);
	} catch (err) {
		if (isAPIError(err) && err.body) {
			serverLogger.error(err, err.body);

			const { $ERROR_CODES } = auth;

			switch (err.body.code) {
				case $ERROR_CODES.ORGANIZATION_ALREADY_EXISTS.code:
				case $ERROR_CODES.ORGANIZATION_SLUG_ALREADY_TAKEN.code:
					return invalid(issue.slug(`${leagueFormLabels.slug} already taken.`));
				case $ERROR_CODES.YOU_ARE_NOT_ALLOWED_TO_CREATE_A_NEW_ORGANIZATION.code:
				case $ERROR_CODES.YOU_HAVE_REACHED_THE_MAXIMUM_NUMBER_OF_ORGANIZATIONS.code:
					return invalid(`You are not allowed to make a league.`);
			}
		}

		serverLogger.error(err);

		return invalid('Something went wrong.');
	}
});

export const isUserLeagueOrganizer = query(async () => {
	const { activeOrganizationId } = await requireSession();

	if (!activeOrganizationId) {
		return false;
	}

	const organization = await db.query.organization.findFirst({
		where: { id: activeOrganizationId },
		columns: { type: true },
	});

	return organization?.type === 'league' && (await isUserOrgAdmin());
});

export const requireLeagueOrganizer = query(async () => {
	if (!(await isUserLeagueOrganizer())) {
		forbidden({ resource: 'user' });
	}
});

export const updateLeague = form(updateLeagueSchema, async ({ id, ...values }, issue) => {
	await requireLeagueOrganizer();

	const {
		request: { headers },
	} = getRequestEvent();
	try {
		await auth.api.updateOrganization({
			body: {
				data: {
					...values,
				},
				organizationId: id,
			},
			headers,
		});

		serverLogger.info('league updated', id);

		void getOrganization().refresh();
	} catch (err) {
		if (isAPIError(err) && err.body) {
			serverLogger.error(err, err.body);

			const { $ERROR_CODES } = auth;

			switch (err.body.code) {
				case $ERROR_CODES.ORGANIZATION_ALREADY_EXISTS.code:
				case $ERROR_CODES.ORGANIZATION_SLUG_ALREADY_TAKEN.code:
					return invalid(issue.slug(`${leagueFormLabels.slug} already taken.`));
			}
		}

		serverLogger.error(err);

		return invalid('Something went wrong.');
	}
});
