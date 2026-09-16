import { resolve } from '$app/paths';
import { redirect } from '@sveltejs/kit';
import { canAccessFamilyPlayer } from '$lib/server/family-access.server';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ params }) => {
	const ok = await canAccessFamilyPlayer(params.playerId);
	if (!ok) {
		redirect(303, resolve('/dashboard/[orgSlug]/family', { orgSlug: params.orgSlug }));
	}
	return {};
};
