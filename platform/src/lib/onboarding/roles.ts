import type { Onboarding } from '$lib/server/db/schema';

// An Org is a BetterAuth Organization
export const ORG_CREATOR_ROLES = ['coach', 'organizer'] as const satisfies Onboarding['role'][];

export type OnboardingOrgCreatorRole = (typeof ORG_CREATOR_ROLES)[number];
