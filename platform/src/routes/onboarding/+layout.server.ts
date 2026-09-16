import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { resolve } from '$app/paths';
import { serverLogger } from '$lib/server/logger';
import type { RouteId } from '$app/types';
import { requireUser } from '$lib/api/auth.remote';
import { getOnboarding } from '$lib/api/onboarding.remote';
import { AWAITING_INVITE_STEP, COACH_START_STEP } from '$lib/onboarding/steps';
import { resolveCoachLanding } from '$lib/api/coach.remote';
import { resolveFamilyLanding } from '$lib/api/family.remote';

export const load: LayoutServerLoad = async ({ url }) => {
	const user = await requireUser();
	const onboarding = await getOnboarding({ userId: user.id });

	const coachLanding = await resolveCoachLanding();
	const familyLanding = await resolveFamilyLanding();
	const hasPortal =
		coachLanding.kind === 'single' ||
		coachLanding.kind === 'multi' ||
		familyLanding.kind === 'single' ||
		familyLanding.kind === 'multi';

	if (onboarding.status === 'complete' || hasPortal) {
		redirect(303, resolve('/dashboard'));
	}

	const BASE_ROUTE: RouteId = '/onboarding';
	const AWAITING_ROUTE = '/onboarding/awaiting-invite';
	const soloCoachSteps = new Set<string>([COACH_START_STEP, 'add-players']);

	const isAwaitingInvite =
		onboarding.currentStep === AWAITING_INVITE_STEP ||
		onboarding.role === 'player_follower' ||
		onboarding.role === 'player';

	if (isAwaitingInvite && !(onboarding.role === 'coach' && soloCoachSteps.has(onboarding.currentStep))) {
		if (!url.pathname.startsWith(AWAITING_ROUTE)) {
			redirect(303, resolve(AWAITING_ROUTE));
		}
		return;
	}

	if (!onboarding.role || onboarding.status !== 'in_progress') {
		if (url.pathname !== BASE_ROUTE) {
			redirect(303, BASE_ROUTE);
		}
		return;
	}

	const redirectMap: Partial<Record<NonNullable<typeof onboarding.role>, string>> = {
		organizer: '/onboarding/league-organizer',
		coach: '/onboarding/coach',
	};

	const targetRoute = redirectMap[onboarding.role];

	if (targetRoute && !url.pathname.startsWith(targetRoute)) {
		serverLogger.warn('redirect', url.pathname, '->', targetRoute);
		redirect(303, targetRoute);
	}
};
