import { resolve } from '$app/paths';
import type { DemoLinkKind } from '$lib/schemas/demo';

/** Where a demo link opens for the chosen view. */
export function demoViewPath(orgSlug: string, kind: DemoLinkKind) {
	if (kind === 'family') {
		return resolve('/dashboard/[orgSlug]/family', { orgSlug });
	}
	if (kind === 'coach') {
		return resolve('/dashboard/[orgSlug]/portal', { orgSlug });
	}
	return resolve('/dashboard/[orgSlug]', { orgSlug });
}
