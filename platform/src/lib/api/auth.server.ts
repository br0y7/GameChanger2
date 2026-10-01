import { resolve } from '$app/paths';
import { isRedirect } from '@sveltejs/kit';
import { DASHBOARD_PATH, shouldHonorPreferredRedirect } from '$lib/utils/url';

export { shouldHonorPreferredRedirect };
import { AWAITING_INVITE_STEP, COACH_START_STEP } from '$lib/onboarding/steps';
import { serverLogger } from '$lib/server/logger';

/**
 * Home → Dashboard and post-login landing.
 * Admin → admin org (clears view-as). League organizer → league. Then coach, then family.
 */
export async function resolvePostLoginPath(preferredRedirect?: string | null): Promise<string> {
	if (shouldHonorPreferredRedirect(preferredRedirect)) return preferredRedirect as string;

	const { getUser, isUserAdmin } = await import('./auth.remote');
	const user = await getUser();

	if (user && (await isUserAdmin())) {
		try {
			const { switchToAdminHomeDashboard } = await import('./organization.remote');
			const home = await switchToAdminHomeDashboard();
			return resolve('/dashboard/[orgSlug]', { orgSlug: home.slug });
		} catch (err) {
			if (isRedirect(err)) throw err;
			serverLogger.error(err);
			return DASHBOARD_PATH;
		}
	}

	if (user) {
		const { leagueOrganizerDashboardSlug } = await import('./organization.remote');
		const leagueSlug = await leagueOrganizerDashboardSlug(user.id);
		if (leagueSlug) {
			return resolve('/dashboard/[orgSlug]', { orgSlug: leagueSlug });
		}
	}

	const { resolveCoachLanding } = await import('./coach.remote');
	const coachLanding = await resolveCoachLanding();
	if (coachLanding.kind === 'single') {
		return resolve('/dashboard/[orgSlug]/portal/[teamId]', {
			orgSlug: coachLanding.orgSlug,
			teamId: coachLanding.teamId,
		});
	}
	if (coachLanding.kind === 'multi' && coachLanding.teams[0]?.orgSlug) {
		return resolve('/dashboard/[orgSlug]/portal', {
			orgSlug: coachLanding.teams[0].orgSlug,
		});
	}

	const { resolveFamilyLanding } = await import('./family.remote');
	const familyLanding = await resolveFamilyLanding();
	if (familyLanding.kind === 'single') {
		return resolve('/dashboard/[orgSlug]/family/[playerId]', {
			orgSlug: familyLanding.orgSlug,
			playerId: familyLanding.playerId,
		});
	}
	if (familyLanding.kind === 'multi' && familyLanding.players[0]?.orgSlug) {
		return resolve('/dashboard/[orgSlug]/family', {
			orgSlug: familyLanding.players[0].orgSlug,
		});
	}

	if (user) {
		const { getOnboarding } = await import('./onboarding.remote');
		const onboarding = await getOnboarding({ userId: user.id });
		if (onboarding.status !== 'complete') {
			const soloCoachSteps = new Set<string>([COACH_START_STEP, 'add-players']);
			if (
				onboarding.currentStep === AWAITING_INVITE_STEP ||
				onboarding.role === 'player_follower' ||
				onboarding.role === 'player' ||
				(onboarding.role === 'coach' && !soloCoachSteps.has(onboarding.currentStep))
			) {
				return resolve('/onboarding/awaiting-invite');
			}
			return resolve('/onboarding');
		}
	}

	return DASHBOARD_PATH;
}
