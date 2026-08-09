import { form, getRequestEvent, query } from '$app/server';
import { createLeagueSchema, updateLeagueSchema } from '$lib/schemas/league';
import { auth } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { isUserAdmin, requireSession, requireUser } from './auth.remote';
import { eq } from 'drizzle-orm';
import { serverLogger } from '$lib/server/logger';
import { advanceOnboardingStep } from './onboarding.server';
import { getOnboarding } from './onboarding.remote';
import { isAPIError } from 'better-auth/api';
import { invalid, isRedirect, redirect } from '@sveltejs/kit';
import { NEXT_ORGANIZER_ONBOARDING_STEP } from '$lib/onboarding/steps';
import * as table from '$lib/server/db/schema';
import { leagueFormLabels } from '$lib/forms/labels';
import { isUserOrgAdmin } from './organization.remote';
import { forbidden } from '$lib/server/fail';
import { resolve } from '$app/paths';

export const createLeague = form(createLeagueSchema, async (data, issue) => {
	const user = await requireUser();

	const {
		request: { headers },
	} = getRequestEvent();
	try {
		const league = await auth.api.createOrganization({
			headers,
			body: data,
		});

		await db
			.update(table.organization)
			.set({ type: 'league' })
			.where(eq(table.organization.id, league.id));

		await auth.api.setActiveOrganization({
			headers,
			body: { organizationId: league.id },
		});

		serverLogger.info(user.id, 'created league', league.id);

		if (await isUserAdmin()) {
			redirect(303, resolve('/dashboard/[orgSlug]', { orgSlug: league.slug }));
		} else {
			const onboarding = await getOnboarding({ userId: user.id });
			await advanceOnboardingStep(onboarding, NEXT_ORGANIZER_ONBOARDING_STEP);
		}
	} catch (err) {
		if (isRedirect(err)) {
			serverLogger.info('redirect', err.location);
			throw err;
		}

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
	if (!(await isUserOrgAdmin())) {
		return false;
	}

	const { activeOrganizationId } = await requireSession();

	if (!activeOrganizationId) {
		return false;
	}

	const organization = await db.query.organization.findFirst({
		where: { id: activeOrganizationId },
		columns: { type: true },
	});

	return organization?.type === 'league';
});

export const requireLeagueOrganizer = query(async () => {
	if (!(await isUserLeagueOrganizer())) {
		forbidden({ resource: 'user' });
	}
});

export const updateLeague = form(updateLeagueSchema, async ({ id, ...data }, issue) => {
	await requireLeagueOrganizer();

	const {
		request: { headers },
	} = getRequestEvent();
	try {
		const updated = await auth.api.updateOrganization({
			body: {
				data,
				organizationId: id,
			},
			headers,
		});

		const user = await requireUser();
		serverLogger.info(user.id, 'updated league', id);

		return updated;
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
