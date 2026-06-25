import { type User } from './auth';
import type { Onboarding } from './db/schema';

export const isAdmin = (user: User) => user.role === 'admin';

// 'onboarding is Onboarding' is compiler hint (type guard)
// that onboarding is defined when this returns true
export const isValidOnboarding = (
	role: Onboarding['role'],
	onboarding?: Onboarding | null
): onboarding is Onboarding =>
	(onboarding &&
		onboarding.role &&
		onboarding.role === role &&
		onboarding.status === 'in_progress') ||
	false;
