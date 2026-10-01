import { resolve } from '$app/paths';

/** Dashboard box score for a completed game. */
export function dashboardGameBoxHref(orgSlug: string, seasonSlug: string, gameId: string) {
	return resolve('/dashboard/[orgSlug]/seasons/[seasonSlug]/games/[gameId]', {
		orgSlug,
		seasonSlug,
		gameId,
	});
}
