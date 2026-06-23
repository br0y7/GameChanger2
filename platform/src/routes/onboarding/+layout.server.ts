import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { resolve } from '$app/paths';
import { PUBLIC_APP_URL } from '$env/static/public';
import { isAdmin } from '$lib/server/guards';
import { serverLogger } from '$lib/server/logger';
import type { RouteId } from '$app/types';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	const { user, onboarding } = locals;

	if (!user || !onboarding) {
		serverLogger.warn('No user but hit onboarding');
		redirect(303, resolve('/login'));
	}

	if (isAdmin(user) || onboarding.status === 'complete') {
		redirect(303, PUBLIC_APP_URL);
	}

	const BASE_ROUTE: RouteId = '/onboarding';

	if (!onboarding.role || onboarding.status !== 'in_progress') {
		if (url.pathname !== BASE_ROUTE) {
			redirect(303, BASE_ROUTE);
		}

		return { onboarding, user };
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

	return { onboarding, user };
};
