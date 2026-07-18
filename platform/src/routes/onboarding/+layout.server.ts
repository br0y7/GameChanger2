import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { resolve } from '$app/paths';
import { serverLogger } from '$lib/server/logger';
import type { RouteId } from '$app/types';
import { isUserAdmin, requireUser } from '$lib/api/auth.remote';
import { getOnboarding } from '$lib/api/onboarding.remote';
import { ensureAdminSystemOrganization } from '$lib/api/organization.remote';

export const load: LayoutServerLoad = async ({ url }) => {
	const user = await requireUser();
	const onboarding = await getOnboarding({ userId: user.id });

	if (await isUserAdmin()) {
		await ensureAdminSystemOrganization();
	}

	if (onboarding.status === 'complete') {
		redirect(303, resolve('/dashboard'));
	}

	const BASE_ROUTE: RouteId = '/onboarding';

	if (!onboarding.role || onboarding.status !== 'in_progress') {
		if (url.pathname !== BASE_ROUTE) {
			redirect(303, BASE_ROUTE);
		}

		return;
	}

	// TODO: add the full redirects
	const redirectMap: Record<typeof onboarding.role, RouteId> = {
		organizer: '/onboarding/league-organizer',
		coach: '/onboarding/coach',
	};

	const targetRoute = redirectMap[onboarding.role];

	if (targetRoute && !url.pathname.startsWith(targetRoute)) {
		serverLogger.warn(`Redirected from ${url.pathname} to ${targetRoute}`);
		redirect(303, targetRoute);
	}
};
