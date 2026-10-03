import { resolve } from '$app/paths';
import { error, redirect } from '@sveltejs/kit';
import { writeAdminViewAsCookie } from '$lib/api/view-as';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ cookies, params }) => {
	const mode = params.mode;
	if (mode !== 'admin' && mode !== 'coach' && mode !== 'family') {
		error(404, 'Not found');
	}

	writeAdminViewAsCookie(cookies, mode);
	const dest =
		mode === 'coach'
			? resolve('/dashboard/[orgSlug]/portal', { orgSlug: params.orgSlug })
			: mode === 'family'
				? resolve('/dashboard/[orgSlug]/family', { orgSlug: params.orgSlug })
				: resolve('/dashboard/[orgSlug]', { orgSlug: params.orgSlug });
	redirect(303, dest);
};
