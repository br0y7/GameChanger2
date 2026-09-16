import { redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import type { PageServerLoad } from './$types';

/** Old /stats route → Team Stats */
export const load: PageServerLoad = async ({ params }) => {
	redirect(
		301,
		resolve('/dashboard/[orgSlug]/portal/[teamId]/team-stats', {
			orgSlug: params.orgSlug,
			teamId: params.teamId,
		})
	);
};
