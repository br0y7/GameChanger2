import { resolve } from '$app/paths';
import { redirect } from '@sveltejs/kit';
import { canAccessTeam } from '$lib/server/coach-access.server';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ params }) => {
	const access = await canAccessTeam(params.teamId, 'view');
	if (!access.ok) {
		redirect(303, resolve('/dashboard/[orgSlug]/portal', { orgSlug: params.orgSlug }));
	}
	return {};
};
