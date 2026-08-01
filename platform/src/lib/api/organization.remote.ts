import { getRequestEvent, query } from '$app/server';
import { PUBLIC_APP_NAME } from '$env/static/public';
import type { MemberRole } from '$lib/schemas/member';
import { auth } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { notFound } from '$lib/server/fail';
import { serverLogger } from '$lib/server/logger';
import { slugify } from '$lib/utils/string';
import { requireAdmin, requireSession, requireUser } from './auth.remote';
import * as table from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const isUserOrgAdmin = query(async () => {
	const { activeOrganizationId } = await requireSession();

	if (!activeOrganizationId) {
		return false;
	}

	const user = await requireUser();

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

export const getOrganization = query(async () => {
	const { activeOrganizationId: id } = await requireSession();

	if (!id) {
		notFound({ resource: 'organization', id: id ?? '' });
	}

	const org = await db.query.organization.findFirst({ where: { id } });

	if (!org) {
		notFound({ resource: 'organization', id: id ?? '' });
	}

	return org;
});

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
		const ADMIN_ORG_NAME = `${PUBLIC_APP_NAME} Admins`;

		const org = await auth.api.createOrganization({
			headers,
			body: {
				name: ADMIN_ORG_NAME,
				slug: slugify(ADMIN_ORG_NAME),
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

	void getOrganization().refresh();

	return adminOrg;
});
