import { resolve } from '$app/paths';
import { redirect } from '@sveltejs/kit';
import { getOrganization } from '$lib/api/organization.remote';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const org = await getOrganization({ slug: params.orgSlug });
	if (org.type !== 'league') {
		redirect(303, resolve('/dashboard/[orgSlug]', { orgSlug: org.slug }));
	}
	return {};
};
