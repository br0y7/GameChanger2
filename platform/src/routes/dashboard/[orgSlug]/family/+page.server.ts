import { resolve } from '$app/paths';
import { redirect } from '@sveltejs/kit';
import { resolveFamilyLanding } from '$lib/api/family.remote';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const landing = await resolveFamilyLanding();
	if (landing.kind === 'single' && landing.orgSlug === params.orgSlug) {
		redirect(
			303,
			resolve('/dashboard/[orgSlug]/family/[playerId]', {
				orgSlug: landing.orgSlug,
				playerId: landing.playerId,
			})
		);
	}
	return {};
};
