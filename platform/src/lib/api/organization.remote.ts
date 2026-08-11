import { getRequestEvent, query } from '$app/server';
import { PUBLIC_APP_NAME } from '$env/static/public';
import type { MemberRole } from '$lib/schemas/member';
import { auth } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { notFound } from '$lib/server/fail';
import { serverLogger } from '$lib/server/logger';
import { getUser, requireAdmin, requireSession } from './auth.remote';
import * as table from '$lib/server/db/schema';
import { count, countDistinct, eq } from 'drizzle-orm';
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

export const getOrganizationStats = query(
	z.object({
		id: idField,
	}),
	async ({ id }) => {
		const [[counts], [{ gameCount }]] = await Promise.all([
			db
				.select({
					seasonCount: countDistinct(table.season.id),
					divisionCount: countDistinct(table.division.id),
					teamCount: countDistinct(table.team.id),
					playerCount: countDistinct(table.player.id),
				})
				.from(table.season)
				.leftJoin(table.division, eq(table.division.seasonId, table.season.id))
				.leftJoin(table.team, eq(table.team.divisionId, table.division.id))
				.leftJoin(table.player, eq(table.player.teamId, table.team.id))
				.where(eq(table.season.organizationId, id)),
			db
				.select({ gameCount: count(table.game.id) })
				.from(table.game)
				.innerJoin(table.season, eq(table.game.seasonId, table.season.id))
				.where(eq(table.season.organizationId, id)),
		]);

		return {
			...counts,
			gameCount,
		};
	}
);
