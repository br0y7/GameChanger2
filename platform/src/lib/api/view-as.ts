/** Dashboards an admin can preview. `admin` is their own view. */
export const adminViewModes = ['admin', 'coach', 'family'] as const;

export type AdminViewMode = (typeof adminViewModes)[number];

export const ADMIN_VIEW_AS_COOKIE = 'admin_view_as';
const COOKIE_PATH = { path: '/' } as const;

/** Cookie values that switch the sidebar. Anything else is the admin's own dashboard. */
export function parseAdminViewAsCookie(value: string | undefined | null): AdminViewMode {
	return value === 'coach' || value === 'family' ? value : 'admin';
}

type ViewAsCookies = {
	set: (
		name: string,
		value: string,
		opts: { path: string; httpOnly: boolean; sameSite: 'lax' }
	) => void;
	delete: (name: string, opts: { path: string }) => void;
};

/** Writes the preview cookie. Callers must have already checked that the user is an admin. */
export function writeAdminViewAsCookie(cookies: ViewAsCookies, mode: AdminViewMode) {
	if (mode === 'admin') {
		cookies.delete(ADMIN_VIEW_AS_COOKIE, COOKIE_PATH);
		return;
	}
	cookies.set(ADMIN_VIEW_AS_COOKIE, mode, { ...COOKIE_PATH, httpOnly: true, sameSite: 'lax' });
}
