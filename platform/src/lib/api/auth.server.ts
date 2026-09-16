import { resolve } from '$app/paths';
import { DASHBOARD_PATH } from '$lib/utils/url';
import { AWAITING_INVITE_STEP, COACH_START_STEP } from '$lib/onboarding/steps';

/** Where to send a signed-in user (coach portal → family → awaiting invite → dashboard). */
export async function resolvePostLoginPath(preferredRedirect?: string | null): Promise<string> {
	const safeRedirect =
		preferredRedirect &&
		(preferredRedirect.startsWith(DASHBOARD_PATH) || preferredRedirect.startsWith('/invite/'));
	if (safeRedirect) return preferredRedirect;

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

	const { getUser } = await import('./auth.remote');
	const user = await getUser();
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
