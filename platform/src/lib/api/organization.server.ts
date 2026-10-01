import { getRequestEvent } from '$app/server';
import { auth } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { notFound } from '$lib/server/fail';
import { writeAdminViewAsCookie } from './view-as';

/** Platform admin: system org, no leftover coach/player preview. */
export async function switchToAdminHomeDashboard() {
	const { requireAdmin, requireSession } = await import('./auth.remote');
	const { ensureAdminSystemOrganization, getOrganizations } = await import('./organization.remote');

	const user = await requireAdmin();
	const adminOrg = await ensureAdminSystemOrganization();
	if (!adminOrg) {
		notFound({ resource: 'organization' }, { message: 'Admin organization not found' });
	}

	const {
		request: { headers },
	} = getRequestEvent();

	await auth.api.setActiveOrganization({
		headers,
		body: { organizationId: adminOrg.id },
	});
	writeAdminViewAsCookie(getRequestEvent().cookies, 'admin');
	void requireSession().refresh();
	void getOrganizations({ userId: user.id }).refresh();

	return { slug: adminOrg.slug };
}

/** League the user organizes. Prefers the active org when it is one of those leagues. */
export async function leagueOrganizerDashboardSlug(userId: string): Promise<string | null> {
	const { requireSession } = await import('./auth.remote');

	const memberships = await db.query.member.findMany({
		where: { userId },
		with: { organization: { columns: { id: true, slug: true, type: true } } },
	});
	const leagues = memberships.filter(
		(row) =>
			row.organization?.type === 'league' && (row.role === 'owner' || row.role === 'admin')
	);
	if (leagues.length === 0) return null;

	const session = await requireSession();
	const active = leagues.find((row) => row.organizationId === session.activeOrganizationId);
	return (active ?? leagues[0])?.organization?.slug ?? null;
}
