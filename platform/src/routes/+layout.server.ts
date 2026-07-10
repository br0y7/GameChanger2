import { redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { getUserCount } from '$lib/api/user.remote.js';

export const load = async ({ url }) => {
	if ((await getUserCount()) <= 0 && !url.pathname.startsWith('/setup')) {
		redirect(307, resolve('/setup'));
	}
};
