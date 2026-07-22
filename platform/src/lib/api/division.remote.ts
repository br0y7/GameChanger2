import { form, query } from '$app/server';
import { createDivisionSchema, divisionSchema, updateDivisionSchema } from '$lib/schemas/division';
import * as table from '$lib/server/db/schema';
import { db } from '$lib/server/db';
import { forbidden, internal, internalNoId, notFound } from '$lib/server/fail';
import { serverLogger } from '$lib/server/logger';
import { isConstraintError } from './errors.server';
import { invalid } from '@sveltejs/kit';
import { divisionFormLabels } from '$lib/forms/labels';
import { z } from 'zod';
import { idField, idOnlySchema } from '$lib/schemas/common';
import type { CrudAction, ResourceTarget } from '$lib/forms/types';
import { isUserLeagueOrganizer } from './league.remote';
import { eq } from 'drizzle-orm';

export const getDivisions = query(
	z.object({
		seasonId: idField,
	}),
	async ({ seasonId }) =>
		await db.query.division.findMany({
			where: { seasonId },
			orderBy: { name: 'asc' },
		})
);

const includes = {
	season: z.boolean().optional(),
	teams: z.boolean().optional(),
};

export const getDivision = query(
	z.object({
		id: idField.optional(),
		seasonId: idField.optional(),
		slug: divisionSchema.slug.optional(),
		include: z.object(includes).default({}),
	}),
	async ({ include, ...filters }) => {
		const division = await db.query.division.findFirst({ where: filters, with: include });

		if (!division) {
			notFound(
				{ resource: 'division' },
				{ action: 'read', message: `division not found. ${JSON.stringify(filters)}` }
			);
		}

		return division;
	}
);

async function assertPermissions(action: CrudAction, target: ResourceTarget, seasonId?: string) {
	if (!(await isUserLeagueOrganizer())) {
		forbidden(target);
	}

	const checkSeasonActions: CrudAction[] = ['create', 'update'];

	if (checkSeasonActions.includes(action)) {
		if (!seasonId) {
			internal(target, {
				action,
				message: `This shouldn't happen, pass the season id when creating or updating.`,
			});
		}

		const season = await db.query.season.findFirst({
			where: { id: seasonId },
			columns: { id: true },
		});

		if (!season) {
			notFound({ resource: 'season', id: seasonId });
		}
	}

	const modifyingActions: CrudAction[] = ['update', 'delete'];

	if (!modifyingActions.includes(action)) {
		return;
	}

	if (!target.id) {
		internalNoId(target, { action });
	}

	const division = await db.query.division.findFirst({
		where: { id: target.id },
		columns: { id: true },
	});

	if (!division) {
		notFound(target);
	}
}

export const createDivision = form(createDivisionSchema, async (data, issue) => {
	await assertPermissions('create', { resource: 'division' }, data.seasonId);

	try {
		const [created] = await db
			.insert(table.division)
			.values(data)
			.returning({ id: table.division.id });

		serverLogger.info('division created:', created.id);
	} catch (err) {
		if (isConstraintError(err, table.DIVISION_UNIQUE_SLUG_PER_SEASON_CONSTRAINT)) {
			return invalid(issue.slug(`${divisionFormLabels.slug} already taken.`));
		}

		serverLogger.error(err);
		return invalid('Something went wrong');
	}
});

export const updateDivision = form(updateDivisionSchema, async ({ id, ...data }, issue) => {
	await assertPermissions('update', { resource: 'division', id }, data.seasonId);

	try {
		await db.update(table.division).set(data).where(eq(table.division.id, id));

		serverLogger.info('division updated:', id);
	} catch (err) {
		if (isConstraintError(err, table.DIVISION_UNIQUE_SLUG_PER_SEASON_CONSTRAINT)) {
			return invalid(issue.slug(`${divisionFormLabels.slug} already taken.`));
		}

		serverLogger.error(err);
		return invalid('Something went wrong');
	}
});

export const deleteDivision = form(idOnlySchema, async ({ id }) => {
	await assertPermissions('delete', { resource: 'division', id });

	await db.delete(table.division).where(eq(table.division.id, id));

	serverLogger.info('division deleted:', id);
});
