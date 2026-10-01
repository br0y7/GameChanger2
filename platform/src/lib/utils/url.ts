import type { Pathname } from '$app/types';

export const REDIRECT_TO_PARAM = 'redirectTo';
export const DASHBOARD_PATH = '/dashboard' satisfies Pathname;

/** Deep links from login stay. Bare `/dashboard` is role home, not a leftover bounce. */
export function shouldHonorPreferredRedirect(preferredRedirect?: string | null): boolean {
	if (!preferredRedirect) return false;
	if (preferredRedirect.startsWith('/invite/')) return true;
	if (!preferredRedirect.startsWith(`${DASHBOARD_PATH}/`)) return false;
	return preferredRedirect.length > DASHBOARD_PATH.length + 1;
}
