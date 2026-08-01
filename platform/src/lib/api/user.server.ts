import { USER_ROLE } from '$lib/schemas/user';
import type { User } from '$lib/server/auth';

/**
 * Prefer to use `isUserAdmin` remote query.
 *
 * This function is used for BetterAuth Database Hooks,
 * or you already have the User object and not using
 * the remote query.
 * @param user User, from db hooks, casted to `User`
 * @returns Whether user is admin
 */
export const isAdmin = (user: User) => user.role === USER_ROLE.admin;
