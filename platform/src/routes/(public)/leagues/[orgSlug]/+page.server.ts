import { resolve } from '$app/paths';
import { redirect } from '@sveltejs/kit';
import { getPublicLeagueMeta } from '$lib/api/public-stats.remote';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const meta = await getPublicLeagueMeta({ orgSlug: params.orgSlug });
	const active =
		meta.seasons.find((s) => s.status === 'active') ?? meta.seasons[0] ?? null;
	if (active) {
		redirect(
			303,
			resolve('/leagues/[orgSlug]/[seasonSlug]', {
				orgSlug: params.orgSlug,
				seasonSlug: active.slug,
			})
		);
	}
	return { leagueName: meta.name };
};
