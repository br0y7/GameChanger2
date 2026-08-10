import { getRequestEvent, query } from '$app/server';
import { PUBLIC_APP_NAME } from '$env/static/public';
import type { MemberRole } from '$lib/schemas/member';
import { auth } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { notFound } from '$lib/server/fail';
import { serverLogger } from '$lib/server/logger';
import { getUser, requireAdmin, requireSession } from './auth.remote';
import * as table from '$lib/server/db/schema';
import { count, eq } from 'drizzle-orm';
import { z } from 'zod';
import { idField } from '$lib/schemas/common';

export const isUserOrgAdmin = query(async () => {
	const user = await getUser();

	if (!user) {
		return false;
	}

	const { activeOrganizationId } = await requireSession();

	if (!activeOrganizationId) {
		return false;
	}

	const member = await db.query.member.findFirst({
		where: {
			organizationId: activeOrganizationId,
			userId: user.id,
		},
		columns: {
			role: true,
		},
	});

	const ADMIN_ROLES: MemberRole[] = ['owner', 'admin'];

	return ADMIN_ROLES.includes((member?.role as MemberRole) ?? '');
});

export const getOrganization = query(
	z.union([z.object({ id: idField }), z.object({ slug: z.string() })]),
	async (filters) => {
		const org = await db.query.organization.findFirst({ where: filters });

		if (!org) {
			notFound({ resource: 'organization' }, { message: JSON.stringify(filters) });
		}

		return org;
	}
);

export const ensureAdminSystemOrganization = query(async () => {
	await requireAdmin();

	const session = await requireSession();

	if (session.activeOrganizationId) {
		return;
	}

	let adminOrg = await db.query.organization.findFirst({
		where: {
			type: 'system',
		},
	});

	const {
		request: { headers },
	} = getRequestEvent();

	if (!adminOrg) {
		const org = await auth.api.createOrganization({
			headers,
			body: {
				name: `${PUBLIC_APP_NAME} Admins`,
				slug: 'admin',
			},
		});

		const [updated] = await db
			.update(table.organization)
			.set({
				type: 'system',
			})
			.where(eq(table.organization.id, org.id))
			.returning();

		adminOrg = updated;

		serverLogger.info('admin org created', adminOrg);
	}

	await auth.api.setActiveOrganization({
		headers,
		body: { organizationId: adminOrg.id },
	});

	return adminOrg;
});

export const getOrganizations = query(
	z.object({
		userId: idField,
	}),
	async ({ userId }) =>
		(await db.query.member.findMany({ where: { userId }, with: { organization: true } }))
			.map((m) => m.organization)
			.filter((o) => o !== null)
);

export const getOrgSeasonCount = query(
	z.object({
		organizationId: idField,
	}),
	async ({ organizationId }) => {
		const [{ seasonCount }] = await db
			.select({ seasonCount: count() })
			.from(table.season)
			.where(eq(table.season.organizationId, organizationId));

		return seasonCount;
	}
);

export const getOrgGameCount = query(
	z.object({
		organizationId: idField,
	}),
	async ({ organizationId }) => {
		const [{ gameCount }] = await db
			.select({ gameCount: count(table.game.id) })
			.from(table.game)
			.innerJoin(table.season, eq(table.game.seasonId, table.season.id))
			.where(eq(table.season.organizationId, organizationId));

		return gameCount;
	}
);

export const getOrgDivisionCount = query(
	z.object({
		organizationId: idField,
	}),
	async ({ organizationId }) => {
		const [{ divisionCount }] = await db
			.select({ divisionCount: count(table.division.id) })
			.from(table.division)
			.innerJoin(table.season, eq(table.division.seasonId, table.season.id))
			.where(eq(table.season.organizationId, organizationId));

		return divisionCount;
	}
);

export const getOrgTeamCount = query(
	z.object({
		organizationId: idField,
	}),
	async ({ organizationId }) => {
		const [{ teamCount }] = await db
			.select({ teamCount: count(table.division.id) })
			.from(table.team)
			.innerJoin(table.division, eq(table.team.divisionId, table.division.id))
			.innerJoin(table.season, eq(table.division.seasonId, table.season.id))
			.where(eq(table.season.organizationId, organizationId));

		return teamCount;
	}
);

export const getOrgPlayerCount = query(
	z.object({
		organizationId: idField,
	}),
	async ({ organizationId }) => {
		const [{ playerCount }] = await db
			.select({ playerCount: count(table.division.id) })
			.from(table.player)
			.innerJoin(table.team, eq(table.player.teamId, table.team.id))
			.innerJoin(table.division, eq(table.team.divisionId, table.division.id))
			.innerJoin(table.season, eq(table.division.seasonId, table.season.id))
			.where(eq(table.season.organizationId, organizationId));

		return playerCount;
	}
);
