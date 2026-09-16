import { resolve } from '$app/paths';
import { redirect } from '@sveltejs/kit';
import { getOrganization } from '$lib/api/organization.remote';
import { resolveCoachLanding } from '$lib/api/coach.remote';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const org = await getOrganization({ slug: params.orgSlug });
	if (org.type !== 'league') {
		redirect(303, resolve('/dashboard/[orgSlug]', { orgSlug: org.slug }));
	}

	const landing = await resolveCoachLanding();
	if (landing.kind === 'single' && landing.orgSlug === params.orgSlug) {
		redirect(
			303,
			resolve('/dashboard/[orgSlug]/portal/[teamId]', {
				orgSlug: landing.orgSlug,
				teamId: landing.teamId,
			})
		);
	}

	return {};
};
