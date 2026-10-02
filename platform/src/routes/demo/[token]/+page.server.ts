import { redirect } from '@sveltejs/kit';
import {
	demoDashboardPath,
	loadDemoAccessByToken,
	writeDemoAccessCookie,
} from '$lib/server/demo-access.server';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, cookies, url }) => {
	const access = await loadDemoAccessByToken(params.token);
	if (!access) {
		return { valid: false as const };
	}

	writeDemoAccessCookie(cookies, access.token, access.expiresAt, url.protocol === 'https:');
	redirect(303, demoDashboardPath(access));
};
