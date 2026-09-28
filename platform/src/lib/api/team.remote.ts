import { form, getRequestEvent, query } from '$app/server';
import {
	isPlayerIdentityChange,
	publishSavedPlayer,
	publishScheduleChange,
	relayDashboard,
} from '$lib/server/dashboard-sync.server';
import { createTeamSchema, renameTeamSchema, teamSchema, updateTeamSchema } from '$lib/schemas/team';
import { auth, type User } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { isUserAdmin, requireAdmin, requireUser } from './auth.remote';
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
import { readableTeamName } from '$lib/import/team-match';
import { slugify } from '$lib/utils/string';
import { isUserLeagueOrganizer } from './league.remote';
import { getSeasonTeams } from './league-manage.remote';
import { isUserOrgAdmin } from './organization.remote';

function gameTitle(homeName: string, awayName: string, currentName: string) {
	const base = `${homeName} vs ${awayName}`;
	const suffix = currentName.match(/\s*\([^)]*\)\s*$/)?.[0] ?? '';
	if (!suffix) return base;
	return `${base}${suffix.startsWith(' ') ? suffix : ` ${suffix}`}`;
}

async function seasonIdForTeam(teamId: string) {
	const row = await db.query.team.findFirst({
		where: { id: teamId },
		columns: { id: true },
		with: { division: { columns: { seasonId: true } } },
	});
	return row?.division?.seasonId ?? null;
}

async function syncTeamGameNames(teamId: string) {
	const withTeams = {
		homeTeam: { columns: { name: true } },
		awayTeam: { columns: { name: true } },
	} as const;
	const games = [
		...(await db.query.game.findMany({ where: { homeTeamId: teamId }, with: withTeams })),
		...(await db.query.game.findMany({ where: { awayTeamId: teamId }, with: withTeams })),
	];
	const seen = new Set<string>();

	for (const game of games) {
		if (seen.has(game.id) || !game.homeTeam || !game.awayTeam) continue;
		seen.add(game.id);
		const name = gameTitle(game.homeTeam.name, game.awayTeam.name, game.name);
		if (game.name !== name) {
			await db.update(table.game).set({ name }).where(eq(table.game.id, game.id));
		}
	}
}

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

	if (action === 'update' && (await isUserAdmin())) {
		return;
	}

	const coach = await getCoach({ userId: user.id, teamId: team.id });

	if (!coach) {
		forbidden(target);
	}

	const teamWithOrg = await db.query.team.findFirst({
		where: { id: team.id },
		with: {
			division: {
				with: {
					season: {
						with: { organization: true },
					},
				},
			},
		},
	});

	if (teamWithOrg?.division?.season?.organization?.type === 'league') {
		forbidden(target, { message: 'Coach portal is read-only for now.' });
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
					email: user.email,
					userId: user.id,
					teamId: createdTeam.id,
					assignmentRole: 'head_coach',
					status: 'active',
					acceptedAt: new Date(),
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
		const name = readableTeamName(data.name);
		await db.update(table.team).set({ ...data, name }).where(eq(table.team.id, id));
		await syncTeamGameNames(id);
		void getTeams({ divisionId: data.divisionId }).refresh();
		const seasonId = await seasonIdForTeam(id);
		if (seasonId) await publishScheduleChange(seasonId);

		serverLogger.info('updated team', { id, userId: user.id });
	} catch (err) {
		if (isConstraintError(err, table.TEAM_UNIQUE_SLUG_PER_DIVISION_CONSTRAINT)) {
			return invalid(issue.slug(`${teamFormLabels.slug} already taken`));
		}

		serverLogger.error(err);
		return invalid('Something went wrong');
	}
});

export const renameTeam = form(renameTeamSchema, async ({ id, name }, issue) => {
	await requireAdmin();
	const existing = await getTeam({ id });
	const nextName = readableTeamName(name);
	const slug = slugify(nextName);

	if (!slug) {
		return invalid(issue.name('Team name needs at least one letter or number.'));
	}

	if (nextName === existing.name && slug === existing.slug) {
		return { name: existing.name, slug: existing.slug };
	}

	if (slug !== existing.slug) {
		const clash = await db.query.team.findFirst({
			where: { divisionId: existing.divisionId, slug },
			columns: { id: true },
		});
		if (clash && clash.id !== existing.id) {
			return invalid(issue.name('A team with that name already exists in this division.'));
		}
	}

	try {
		await db.update(table.team).set({ name: nextName, slug }).where(eq(table.team.id, id));
		await syncTeamGameNames(id);
		// A new slug is a new page address. Reloading the open page first would miss that address.
		if (slug === existing.slug) {
			await publishSavedPlayer(id, id, 'player');
		}

		const user = await requireUser();
		serverLogger.info('renamed team', { id, userId: user.id, name: nextName });

		void getTeams({ divisionId: existing.divisionId }).refresh();
		const seasonId = await seasonIdForTeam(id);
		if (seasonId) await publishScheduleChange(seasonId);
		const division = await db.query.division.findFirst({
			where: { id: existing.divisionId },
			columns: { seasonId: true },
		});
		if (division) {
			void getSeasonTeams({ seasonId: division.seasonId }).refresh();
		}

		return { name: nextName, slug };
	} catch (err) {
		if (isConstraintError(err, table.TEAM_UNIQUE_SLUG_PER_DIVISION_CONSTRAINT)) {
			return invalid(issue.name('A team with that name already exists in this division.'));
		}

		serverLogger.error(err);
		return invalid('Something went wrong');
	}
});

export const deleteTeam = form(idOnlySchema, async ({ id }) => {
	const user = await requireUser();

	await assertPermissions('delete', { resource: 'team', id }, user);

	const seasonId = await seasonIdForTeam(id);
	await db.delete(table.team).where(eq(table.team.id, id));
	if (seasonId) await publishScheduleChange(seasonId);

	serverLogger.info('deleted team', { id, userId: user.id });
});

const includes = {
	players: z.boolean().optional(),
	coaches: z.boolean().optional(),
	division: z.boolean().optional(),
};

export const getTeam = query.live(
	z.object({
		id: idField.optional(),
		slug: teamSchema.slug.optional(),
		divisionId: idField.optional(),
		include: z.object(includes).default({}),
	}),
	({ include, ...filters }) =>
		relayDashboard(
			async () => {
				const team = await db.query.team.findFirst({ where: filters, with: include });

				if (!team) {
					notFound(
						{ resource: 'team' },
						{ action: 'read', message: `team not found. ${JSON.stringify(filters)}` }
					);
				}

				return team;
			},
			(team, change) => isPlayerIdentityChange(change, { teamId: team.id })
		)
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
