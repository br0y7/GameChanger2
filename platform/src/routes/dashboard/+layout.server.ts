import { getUser } from '$lib/api/auth.remote.js';
import type { RouteId } from '$app/types';
import { getOrganization } from '$lib/api/organization.remote.js';
import { redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { serverLogger } from '$lib/server/logger.js';

export const load = async (request) => {
	const user = getUser();

	if (!user) {
		return;
	}

	const BASE_ROUTE: RouteId = '/dashboard';

	if (request.url.pathname !== BASE_ROUTE) {
		return;
	}

	const org = await getOrganization();
	const dashboardURL = resolve('/dashboard/[orgSlug]', { orgSlug: org.slug });

	serverLogger.info(`redirect /dashboard -> ${dashboardURL}`);

	redirect(307, dashboardURL);
};
