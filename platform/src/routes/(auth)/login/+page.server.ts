import { redirect } from '@sveltejs/kit';
import { getUser } from '$lib/api/auth.remote';
import { resolvePostLoginPath } from '$lib/api/auth.server';
import { REDIRECT_TO_PARAM } from '$lib/utils/url';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const user = await getUser();
	if (!user) return {};

	const redirectTo = url.searchParams.get(REDIRECT_TO_PARAM);
	redirect(303, await resolvePostLoginPath(redirectTo));
};
