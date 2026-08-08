import { form, query } from '$app/server';
import { createSeasonSchema, seasonSchema, updateSeasonSchema } from '$lib/schemas/season';
import { db } from '$lib/server/db';
import { requireSession, requireUser } from './auth.remote';
import { serverLogger } from '$lib/server/logger';
import { advanceOnboardingStep } from './onboarding.server';
import { forbidden, internalNoId, notFound } from '$lib/server/fail';
import { getOnboarding } from './onboarding.remote';
import { invalid } from '@sveltejs/kit';
import { NEXT_ORGANIZER_ONBOARDING_STEP } from '$lib/onboarding/steps';
import * as table from '$lib/server/db/schema';
import { isConstraintError } from './errors.server';
import { seasonFormLabels } from '$lib/forms/labels';
import { idField, idOnlySchema } from '$lib/schemas/common';
import z from 'zod';
import { isUserLeagueOrganizer } from './league.remote';
import { getOrganization } from './organization.remote';
import { EmptyFilter, eq } from 'drizzle-orm';
import type { CrudAction, ResourceTarget } from '$lib/forms/types';

const includes = {
	organization: z.boolean().optional(),
	games: z.boolean().optional(),
	divisions: z.boolean().optional(),
};

export const getSeasons = query(
	z.object({ organizationId: idField.optional(), include: z.object(includes).default({}) }),
	async ({ organizationId, include }) => {
		return await db.query.season.findMany({
			where: organizationId ? { organizationId } : EmptyFilter,
			with: include,
			orderBy: { updatedAt: 'desc' },
		});
	}
);

export const getSeason = query(
	z
		.union([
			z.object({ id: idField }),
			z.object({ organizationId: idField, slug: seasonSchema.slug }),
		])
		.and(z.object({ include: z.object(includes).default({}) })),
	async ({ include, ...filters }) => {
		const season = await db.query.season.findFirst({ where: filters, with: include });
		if (!season) {
			notFound(
				{ resource: 'season' },
				{ action: 'read', message: `season not found. ${JSON.stringify(filters)}` }
			);
		}
		return season;
	}
);

export const getCurrentSeason = query(
	z.object({
		organizationId: idField,
	}),
	async ({ organizationId }) => {
		return await db.query.season.findFirst({
			where: { organizationId, status: 'active' },
			orderBy: { createdAt: 'desc' },
		});
	}
);

async function assertPermissions(action: CrudAction, target: ResourceTarget) {
	if (!(await isUserLeagueOrganizer())) {
		forbidden(target);
	}

	const modifyingActions: CrudAction[] = ['update', 'delete'];

	if (!modifyingActions.includes(action)) {
		return;
	}

	if (!target.id) {
		internalNoId(target, { action });
	}

	// validates existence
	await getSeason({ id: target.id });
}

export const createSeason = form(createSeasonSchema, async (data, issue) => {
	const user = await requireUser();
	const { activeOrganizationId } = await requireSession();

	if (!activeOrganizationId) {
		serverLogger.error(`createSeason: no active organization`);
		return invalid('Something went wrong.');
	}

	const org = await getOrganization({ id: activeOrganizationId });

	await assertPermissions('create', { resource: 'season' });

	try {
		const [created] = await db
			.insert(table.season)
			.values({
				...data,
				organizationId: org.id,
			})
			.returning({ id: table.season.id });

		const onboarding = await getOnboarding({ userId: user.id });
		if (onboarding.status !== 'complete') {
			await advanceOnboardingStep(onboarding, NEXT_ORGANIZER_ONBOARDING_STEP);
		}

		void getSeasons({ organizationId: org.id }).refresh();

		serverLogger.info('season created', created.id);
	} catch (err) {
		if (isConstraintError(err, table.SEASON_UNIQUE_SLUG_PER_ORG_CONSTRAINT)) {
			return invalid(issue.slug(`${seasonFormLabels.slug} already taken.`));
		}

		serverLogger.error(err);

		return invalid('Something went wrong.');
	}
});

export const updateSeason = form(updateSeasonSchema, async ({ id, ...data }, issue) => {
	await assertPermissions('update', { resource: 'season', id });

	try {
		const [updated] = await db
			.update(table.season)
			.set(data)
			.where(eq(table.season.id, id))
			.returning({ id: table.season.id });

		serverLogger.info('season updated', updated.id);
	} catch (err) {
		if (isConstraintError(err, table.SEASON_UNIQUE_SLUG_PER_ORG_CONSTRAINT)) {
			return invalid(issue.slug(`${seasonFormLabels.slug} already taken.`));
		}

		serverLogger.error(err);

		return invalid('Something went wrong.');
	}
});

export const deleteSeason = form(idOnlySchema, async ({ id }) => {
	await assertPermissions('delete', { resource: 'season', id });

	await db.delete(table.season).where(eq(table.season.id, id));

	serverLogger.info('season deleted', id);
});
