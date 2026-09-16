import { resolve } from '$app/paths';
import { redirect } from '@sveltejs/kit';
import { getUser, isUserAdmin } from '$lib/api/auth.remote';
import { resolveCoachLanding } from '$lib/api/coach.remote';
import { resolveFamilyLanding } from '$lib/api/family.remote';
import { isUserLeagueOrganizer } from '$lib/api/league.remote';
import type { LayoutServerLoad } from './$types';

const ADMIN_ONLY_SEGMENTS = new Set([
	'seasons',
	'teams',
	'players',
	'games',
	'coaches',
	'import',
	'invites',
]);

export const load: LayoutServerLoad = async ({ params, url }) => {
	const user = await getUser();
	if (!user) return {};

	if ((await isUserAdmin()) || (await isUserLeagueOrganizer())) {
		return {};
	}

	const parts = url.pathname.split('/').filter(Boolean);
	const afterOrg = parts[2];

	const coachLanding = await resolveCoachLanding();
	if (coachLanding.kind !== 'none') {
		if (!afterOrg) {
			if (coachLanding.kind === 'single') {
				redirect(
					303,
					resolve('/dashboard/[orgSlug]/portal/[teamId]', {
						orgSlug: coachLanding.orgSlug,
						teamId: coachLanding.teamId,
					})
				);
			}
			redirect(303, resolve('/dashboard/[orgSlug]/portal', { orgSlug: params.orgSlug }));
		}

		if (afterOrg === 'portal' || afterOrg === 'settings' || afterOrg === 'family') {
			return {};
		}

		if (ADMIN_ONLY_SEGMENTS.has(afterOrg)) {
			if (coachLanding.kind === 'single') {
				redirect(
					303,
					resolve('/dashboard/[orgSlug]/portal/[teamId]', {
						orgSlug: coachLanding.orgSlug,
						teamId: coachLanding.teamId,
					})
				);
			}
			redirect(303, resolve('/dashboard/[orgSlug]/portal', { orgSlug: params.orgSlug }));
		}

		return {};
	}

	const familyLanding = await resolveFamilyLanding();
	if (familyLanding.kind === 'none') {
		return {};
	}

	if (!afterOrg) {
		if (familyLanding.kind === 'single') {
			redirect(
				303,
				resolve('/dashboard/[orgSlug]/family/[playerId]', {
					orgSlug: familyLanding.orgSlug,
					playerId: familyLanding.playerId,
				})
			);
		}
		redirect(303, resolve('/dashboard/[orgSlug]/family', { orgSlug: params.orgSlug }));
	}

	if (afterOrg === 'family' || afterOrg === 'settings') {
		return {};
	}

	// Allow public-ish season stats pages; block admin manage hubs
	if (ADMIN_ONLY_SEGMENTS.has(afterOrg) || afterOrg === 'portal') {
		if (familyLanding.kind === 'single') {
			redirect(
				303,
				resolve('/dashboard/[orgSlug]/family/[playerId]', {
					orgSlug: familyLanding.orgSlug,
					playerId: familyLanding.playerId,
				})
			);
		}
		redirect(303, resolve('/dashboard/[orgSlug]/family', { orgSlug: params.orgSlug }));
	}

	return {};
};
