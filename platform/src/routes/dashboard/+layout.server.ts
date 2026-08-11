import { getUser, isUserAdmin, requireSession } from '$lib/api/auth.remote.js';
import { ensureAdminSystemOrganization, getOrganization } from '$lib/api/organization.remote.js';
import { redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { serverLogger } from '$lib/server/logger.js';
import { getOnboarding } from '$lib/api/onboarding.remote.js';
import { DASHBOARD_PATH } from '$lib/utils/url.js';

export const load = async (request) => {
	const user = await getUser();

	if (!user) {
		return;
	}

	const onboarding = await getOnboarding({ userId: user.id });

	if (onboarding.status !== 'complete') {
		redirect(307, resolve('/onboarding'));
	}

	if (request.url.pathname !== DASHBOARD_PATH) {
		return;
	}

	if (await isUserAdmin()) {
		await ensureAdminSystemOrganization();
	}

	const session = await requireSession();

	if (!session.activeOrganizationId) {
		return;
	}

	const org = await getOrganization({ id: session.activeOrganizationId });
	const dashboardURL = resolve('/dashboard/[orgSlug]', { orgSlug: org.slug });

	serverLogger.info(`redirect /dashboard -> ${dashboardURL}`);

	redirect(307, dashboardURL);
};
