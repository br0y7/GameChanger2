import { form, getRequestEvent, query } from '$app/server';
import { createSeasonSchema } from '$lib/schemas/season';
import { db } from '$lib/server/db';
import { requireUser } from './auth.remote';
import { serverLogger } from '$lib/server/logger';
import { advanceOnboardingStep } from './onboarding.server';
import { unauthorized } from '$lib/server/fail';
import { getOnboardingWithUser } from './onboarding.remote';
import { invalid } from '@sveltejs/kit';
import { NEXT_ORGANIZER_ONBOARDING_STEP } from '$lib/onboarding/steps';
import * as table from '$lib/server/db/schema';
import { isConstraintError } from './errors.server';
import { seasonFormLabels } from '$lib/forms/labels';
import { requiredId } from '$lib/schemas/common';
import z from 'zod';

export const createSeason = form(createSeasonSchema, async (data, issue) => {
	const user = await requireUser();
	const onboarding = await getOnboardingWithUser({ id: user.id });

	const {
		locals: { session },
	} = getRequestEvent();

	if (!session?.activeOrganizationId) {
		serverLogger.error('tried creating a season but no active organization');
		return unauthorized({ resource: 'season' });
	}

	try {
		const [created] = await db
			.insert(table.season)
			.values({
				...data,
				organizationId: session.activeOrganizationId,
			})
			.returning({ id: table.season.id });

		await advanceOnboardingStep(onboarding, NEXT_ORGANIZER_ONBOARDING_STEP);

		serverLogger.info(`season created: ${created.id}`);
	} catch (err) {
		if (isConstraintError(err, table.SEASON_UNIQUE_SLUG_PER_ORG_CONSTRAINT)) {
			return invalid(issue.slug(`${seasonFormLabels.slug} already taken.`));
		}

		serverLogger.error(err);

		return invalid('Something went wrong.');
	}
});

const includes = {
	divisions: z.boolean().optional(),
	games: z.boolean().optional(),
};

export const getCurrentSeasonByOrgId = query(
	z.object({
		...requiredId,
		include: z.object(includes).default({}),
	}),
	async ({ id, include }) =>
		await db.query.season.findFirst({
			where: { organizationId: id, status: 'active' },
			orderBy: { createdAt: 'desc' },
			with: include,
		})
);
