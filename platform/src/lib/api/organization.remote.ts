import { query } from '$app/server';
import type { MemberRole } from '$lib/schemas/member';
import { db } from '$lib/server/db';
import { requireSession, requireUser } from './auth.remote';

export const isUserOrgAdmin = query(async () => {
	const { activeOrganizationId } = await requireSession();

	if (!activeOrganizationId) {
		console.log('no active organization id');
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
