import { form, getRequestEvent, query } from '$app/server';
import { createTeamSchema, teamSchema, updateTeamSchema } from '$lib/schemas/team';
import { auth, type User } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { requireUser } from './auth.remote';
import { serverLogger } from '$lib/server/logger';
import { invalid } from '@sveltejs/kit';
import { forbidden, internal, internalNoId, notFound } from '$lib/server/fail';
import { getOnboarding } from './onboarding.remote';
import { NEXT_COACH_ONBOARDING_STEP } from '$lib/onboarding/steps';
import { isAPIError } from 'better-auth/api';
import { advanceOnboardingStep } from './onboarding.server';
import { idField, idOnlySchema } from '$lib/schemas/common';
import { getCoach } from './coach.remote';
import { z } from 'zod';
import * as table from '$lib/server/db/schema';
import type { CrudAction, ResourceTarget } from '$lib/forms/types';
import { isConstraintError } from './errors.server';
import { teamFormLabels } from '$lib/forms/labels';
import { isUserLeagueOrganizer } from './league.remote';
import { isUserOrgAdmin } from './organization.remote';

async function assertPermissions(
	action: CrudAction,
	target: ResourceTarget,
	user: User
): Promise<void> {
	if (action === 'create' && !(await isUserOrgAdmin())) {
		forbidden(target);
	}

	const modifyingActions: CrudAction[] = ['update', 'delete'];

	if (!modifyingActions.includes(action)) {
		return;
	}

	if (!target.id) {
		internalNoId(target, { action });
	}

	const team = await getTeam({ id: target.id });

	if (!team) {
		notFound(target);
	}

	if (await isUserLeagueOrganizer()) {
		return;
	}

	const coach = await getCoach({ userId: user.id, teamId: team.id });

	if (!coach) {
		forbidden(target);
	}
}

export const createTeam = form(createTeamSchema, async (data, issue) => {
	const user = await requireUser();

	const { name, slug, flow } = data;
	let { divisionId } = data;

	const {
		request: { headers },
	} = getRequestEvent();

	if (flow === 'solo-coach') {
		try {
			divisionId = await db.transaction(async (tx) => {
				const teamOrg = await auth.api.createOrganization({
					headers,
					body: { name, slug },
				});

				await tx
					.update(table.organization)
					.set({ type: 'team' })
					.where(eq(table.organization.id, teamOrg.id));

				await auth.api.setActiveOrganization({
					body: {
						organizationId: teamOrg.id,
					},
					headers,
				});

				serverLogger.info('created default team org', {
					id: teamOrg.id,
					userId: user.id,
				});

				const [defaultSeason] = await tx
					.insert(table.season)
					.values({
						name: `Current Season for ${name}`,
						slug: 'current',
						organizationId: teamOrg.id,
					})
					.returning({ id: table.season.id });

				serverLogger.info('created default season for team org', {
					id: defaultSeason.id,
					userId: user.id,
				});

				const [defaultDivision] = await tx
					.insert(table.division)
					.values({
						name: `Division for ${name}`,
						slug: `${slug}-division`,
						seasonId: defaultSeason.id,
					})
					.returning({ id: table.division.id });

				serverLogger.info('created default division for team org', {
					id: defaultDivision.id,
					userId: user.id,
				});

				return defaultDivision.id;
			});
		} catch (err) {
			if (isAPIError(err) && err.body) {
				serverLogger.error(err, err.body);

				const { $ERROR_CODES } = auth;

				switch (err.body.code) {
					case $ERROR_CODES.ORGANIZATION_ALREADY_EXISTS.code:
					case $ERROR_CODES.ORGANIZATION_SLUG_ALREADY_TAKEN.code:
						return invalid(issue.slug('Slug already exists.'));
					case $ERROR_CODES.YOU_ARE_NOT_ALLOWED_TO_CREATE_A_NEW_ORGANIZATION.code:
					case $ERROR_CODES.YOU_HAVE_REACHED_THE_MAXIMUM_NUMBER_OF_ORGANIZATIONS.code:
						return invalid(`You are not allowed to make a team.`);
				}
			}

			serverLogger.error(err);
			return invalid('Something went wrong.');
		}
	}

	if (!divisionId) {
		switch (flow) {
			case 'standard':
				return invalid(issue.divisionId('Division is required.'));
			case 'solo-coach':
				return internal({ resource: 'team' }, { message: 'Unreachable code ran in createTeam.' });
		}
	}

	await assertPermissions('create', { resource: 'team' }, user);

	try {
		const [createdTeam] = await db
			.insert(table.team)
			.values({
				name,
				slug,
				divisionId,
			})
			.returning({ id: table.team.id });

		serverLogger.info('created team', { id: createdTeam.id, userId: user.id });

		if (flow === 'solo-coach') {
			const [createdCoach] = await db
				.insert(table.coach)
				.values({
					name: user.name,
					userId: user.id,
					teamId: createdTeam.id,
				})
				.returning({ id: table.coach.id });

			serverLogger.info('created coach', { id: createdCoach.id, userId: user.id });

			const onboarding = await getOnboarding({ userId: user.id });

			await advanceOnboardingStep(onboarding, NEXT_COACH_ONBOARDING_STEP);

			// refresh the queries to update the page
			void getOnboarding({ userId: user.id }).refresh();
			void getCoach({ userId: user.id }).refresh();
		}
	} catch (err) {
		if (isConstraintError(err, table.TEAM_UNIQUE_SLUG_PER_DIVISION_CONSTRAINT)) {
			return invalid(issue.slug(`${teamFormLabels.slug} already taken`));
		}

		serverLogger.error(err);
		return invalid('Something went wrong');
	}
});

export const updateTeam = form(updateTeamSchema, async ({ id, ...data }, issue) => {
	const user = await requireUser();

	await assertPermissions('update', { resource: 'team', id }, user);

	try {
		await db.update(table.team).set(data).where(eq(table.team.id, id));

		serverLogger.info('updated team', { id, userId: user.id });
	} catch (err) {
		if (isConstraintError(err, table.TEAM_UNIQUE_SLUG_PER_DIVISION_CONSTRAINT)) {
			return invalid(issue.slug(`${teamFormLabels.slug} already taken`));
		}

		serverLogger.error(err);
		return invalid('Something went wrong');
	}
});

export const deleteTeam = form(idOnlySchema, async ({ id }) => {
	const user = await requireUser();

	await assertPermissions('delete', { resource: 'team', id }, user);

	await db.delete(table.team).where(eq(table.team.id, id));

	serverLogger.info('deleted team', { id, userId: user.id });
});

const includes = {
	players: z.boolean().optional(),
	coaches: z.boolean().optional(),
	division: z.boolean().optional(),
};

export const getTeam = query(
	z.object({
		id: idField.optional(),
		slug: teamSchema.slug.optional(),
		divisionId: idField.optional(),
		include: z.object(includes).default({}),
	}),
	async ({ include, ...filters }) => {
		const team = await db.query.team.findFirst({ where: filters, with: include });

		if (!team) {
			notFound(
				{ resource: 'team' },
				{ action: 'read', message: `team not found. ${JSON.stringify(filters)}` }
			);
		}

		return team;
	}
);

export const getTeams = query(
	z.object({
		divisionId: idField,
		include: z.object(includes).default({}),
	}),
	async ({ divisionId, include }) =>
		await db.query.team.findMany({
			where: { divisionId },
			with: include,
			orderBy: (team, { asc }) => [asc(team.name)],
		})
);
