import { form, query } from '$app/server';
import { createSeasonSchema } from '$lib/schemas/season';
import { db } from '$lib/server/db';
import { requireSession, requireUser } from './auth.remote';
import { serverLogger } from '$lib/server/logger';
import { advanceOnboardingStep } from './onboarding.server';
import { unauthorized } from '$lib/server/fail';
import { getOnboarding } from './onboarding.remote';
import { invalid } from '@sveltejs/kit';
import { NEXT_ORGANIZER_ONBOARDING_STEP } from '$lib/onboarding/steps';
import * as table from '$lib/server/db/schema';
import { isConstraintError } from './errors.server';
import { seasonFormLabels } from '$lib/forms/labels';
import { idField } from '$lib/schemas/common';
import z from 'zod';

export const createSeason = form(createSeasonSchema, async (data, issue) => {
	const user = await requireUser();
	const onboarding = await getOnboarding({ userId: user.id });

	const session = await requireSession();

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

export const getCurrentSeason = query(
	z.object({
		organizationId: idField,
	}),
	async ({ organizationId }) =>
		await db.query.season.findFirst({
			where: { organizationId, status: 'active' },
			orderBy: { createdAt: 'desc' },
		})
);

const includes = {
	organization: z.boolean().optional(),
	games: z.boolean().optional(),
	divisions: z.boolean().optional(),
};

export const getSeasons = query(z.object(includes), async (include) => {
	return await db.query.season.findMany({ with: { ...include } });
});
