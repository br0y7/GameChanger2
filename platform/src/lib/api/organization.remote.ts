import { getRequestEvent, query, command } from '$app/server';
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
	const user = await requireAdmin();
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

		serverLogger.info('created admin org', { orgId: adminOrg.id, adminId: user.id });
	}

	await auth.api.setActiveOrganization({
		headers,
		body: { organizationId: adminOrg.id },
	});

	void requireSession().refresh();

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

/** Featured league used on the public homepage (platform admin branding target). */
export const getHomepageLeague = query(async () => {
	return (
		(await db.query.organization.findFirst({
			where: { slug: 'winnipeg-rising-star' },
		})) ??
		(await db.query.organization.findFirst({
			where: { type: 'league' },
			orderBy: { createdAt: 'asc' },
		})) ??
		null
	);
});

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

/** Platform admin: every league with active/latest season for stats links. */
export const listAllLeaguesForAdmin = query(async () => {
	await requireAdmin();

	const leagues = await db.query.organization.findMany({
		where: { type: 'league' },
		orderBy: { name: 'asc' },
		columns: { id: true, name: true, slug: true, logo: true, createdAt: true },
	});

	const rows = await Promise.all(
		leagues.map(async (league) => {
			const season =
				(await db.query.season.findFirst({
					where: { organizationId: league.id, status: 'active' },
					orderBy: { createdAt: 'desc' },
					columns: { id: true, name: true, slug: true, status: true },
				})) ??
				(await db.query.season.findFirst({
					where: { organizationId: league.id },
					orderBy: { createdAt: 'desc' },
					columns: { id: true, name: true, slug: true, status: true },
				}));

			const [[counts], [{ gameCount }]] = await Promise.all([
				db
					.select({
						seasonCount: countDistinct(table.season.id),
						teamCount: countDistinct(table.team.id),
						playerCount: countDistinct(table.player.id),
					})
					.from(table.season)
					.leftJoin(table.division, eq(table.division.seasonId, table.season.id))
					.leftJoin(table.team, eq(table.team.divisionId, table.division.id))
					.leftJoin(table.player, eq(table.player.teamId, table.team.id))
					.where(eq(table.season.organizationId, league.id)),
				db
					.select({ gameCount: count(table.game.id) })
					.from(table.game)
					.innerJoin(table.season, eq(table.game.seasonId, table.season.id))
					.where(eq(table.season.organizationId, league.id)),
			]);

			return {
				...league,
				season,
				stats: {
					teams: Number(counts.teamCount ?? 0),
					players: Number(counts.playerCount ?? 0),
					games: Number(gameCount ?? 0),
					seasons: Number(counts.seasonCount ?? 0),
				},
			};
		})
	);

	return rows;
});

/** Platform admin: join league membership if needed and set it active for dashboard access. */
export const enterLeagueAsAdmin = command(
	z.object({
		organizationId: idField,
		destination: z.enum(['dashboard', 'stats']).default('dashboard'),
	}),
	async ({ organizationId, destination }) => {
		const user = await requireAdmin();

		const league = await db.query.organization.findFirst({
			where: { id: organizationId, type: 'league' },
			columns: { id: true, slug: true, name: true },
		});

		if (!league) {
			notFound({ resource: 'organization', id: organizationId });
		}

		const existing = await db.query.member.findFirst({
			where: { organizationId: league.id, userId: user.id },
			columns: { id: true },
		});

		if (!existing) {
			await db.insert(table.member).values({
				organizationId: league.id,
				userId: user.id,
				role: 'admin',
			});
			serverLogger.info('admin joined league', { orgId: league.id, userId: user.id });
		}

		const {
			request: { headers },
		} = getRequestEvent();

		await auth.api.setActiveOrganization({
			headers,
			body: { organizationId: league.id },
		});

		void requireSession().refresh();

		const season =
			(await db.query.season.findFirst({
				where: { organizationId: league.id, status: 'active' },
				orderBy: { createdAt: 'desc' },
				columns: { slug: true },
			})) ??
			(await db.query.season.findFirst({
				where: { organizationId: league.id },
				orderBy: { createdAt: 'desc' },
				columns: { slug: true },
			}));

		return {
			slug: league.slug,
			seasonSlug: season?.slug ?? null,
			destination,
		};
	}
);
