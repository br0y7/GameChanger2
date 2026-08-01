export type UserRole = 'admin' | 'user';

/** Default BetterAuth User Roles */
export const USER_ROLE = {
	admin: 'admin',
	user: 'user',
} as const satisfies Record<UserRole, UserRole>;
