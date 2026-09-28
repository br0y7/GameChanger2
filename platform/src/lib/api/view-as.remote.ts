import { command, getRequestEvent, query } from '$app/server';
import { z } from 'zod';
import { isUserAdmin, requireAdmin } from './auth.remote';
import {
	ADMIN_VIEW_AS_COOKIE,
	adminViewModes,
	parseAdminViewAsCookie,
	writeAdminViewAsCookie,
	type AdminViewMode,
} from './view-as';

/**
 * Which dashboard the current user is previewing.
 *
 * This only ever decides which navigation to draw. It grants nothing: a non-admin who sets the
 * cookie by hand still reads as `admin` here, and every route and remote function keeps its own
 * access check either way.
 */
export const getAdminViewAs = query(async (): Promise<AdminViewMode> => {
	if (!(await isUserAdmin())) return 'admin';

	return parseAdminViewAsCookie(getRequestEvent().cookies.get(ADMIN_VIEW_AS_COOKIE));
});

export const setAdminViewAs = command(z.object({ mode: z.enum(adminViewModes) }), async ({ mode }) => {
	await requireAdmin();
	writeAdminViewAsCookie(getRequestEvent().cookies, mode);
	return { mode };
});
