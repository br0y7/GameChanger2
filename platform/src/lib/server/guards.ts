import { type User } from './auth';
import type { Onboarding } from './db/schema';

export const isAdmin = (user: User) => user.role === 'admin';

export const isValidOnboarding = (role: Onboarding['role'], onboarding?: Onboarding | null) =>
	onboarding && onboarding.role && onboarding.role === role && onboarding.status === 'in_progress';
