import { getUser, isUserAdmin, requireSession } from '$lib/api/auth.remote.js';
import { resolvePostLoginPath } from '$lib/api/auth.server';
import { ensureAdminSystemOrganization, getOrganization } from '$lib/api/organization.remote.js';
import { redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { serverLogger } from '$lib/server/logger.js';
import { getOnboarding } from '$lib/api/onboarding.remote.js';
import { DASHBOARD_PATH, REDIRECT_TO_PARAM } from '$lib/utils/url.js';
import { resolveCoachLanding } from '$lib/api/coach.remote';
import { resolveFamilyLanding } from '$lib/api/family.remote';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async (event) => {
	const user = await getUser();

	if (!user) {
		const loginURL = new URL(resolve('/login'), event.url.origin);
		loginURL.searchParams.set(REDIRECT_TO_PARAM, DASHBOARD_PATH);
		redirect(303, `${loginURL.pathname}${loginURL.search}`);
	}

	const onboarding = await getOnboarding({ userId: user.id });
	const coachLanding = await resolveCoachLanding();
	const familyLanding = await resolveFamilyLanding();
	const hasCoachPortal = coachLanding.kind === 'single' || coachLanding.kind === 'multi';
	const hasFamilyPortal = familyLanding.kind === 'single' || familyLanding.kind === 'multi';

	if (onboarding.status !== 'complete' && !hasCoachPortal && !hasFamilyPortal) {
		redirect(307, resolve('/onboarding'));
	}

	if (event.url.pathname !== DASHBOARD_PATH) {
		return;
	}

	const postLogin = await resolvePostLoginPath(null);
	if (postLogin !== DASHBOARD_PATH) {
		serverLogger.info(`redirect /dashboard -> ${postLogin}`);
		redirect(303, postLogin);
	}

	if (await isUserAdmin()) {
		await ensureAdminSystemOrganization();
	}

	const session = await requireSession();

	if (!session.activeOrganizationId) {
		return;
	}

	const org = await getOrganization({ id: session.activeOrganizationId });
	const dashboardURL = resolve('/dashboard/[orgSlug]', { orgSlug: org.slug });

	serverLogger.info(`redirect /dashboard -> ${dashboardURL}`);

	redirect(307, dashboardURL);
};
