import { command, getRequestEvent, query } from '$app/server';
import { resolve } from '$app/paths';
import { createDemoLinkSchema } from '$lib/schemas/demo';
import { idOnlySchema } from '$lib/schemas/common';
import { requireAdmin } from './auth.remote';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { badRequest } from '$lib/server/fail';
import { clearDemoAccessCookie, getValidDemoAccess } from '$lib/server/demo-access.server';

const DEMO_KIND_LABEL = 'Player, coach & stats';

function absoluteDemoUrl(token: string) {
	const { url } = getRequestEvent();
	return new URL(resolve('/demo/[token]', { token }), url.origin).toString();
}

export const getDemoAccess = query(async () => getValidDemoAccess());

export const exitDemo = command(async () => {
	clearDemoAccessCookie(getRequestEvent().cookies);
	getRequestEvent().locals.demoAccess = null;
	return { ok: true as const };
});

export const listDemoLinks = query(async () => {
	await requireAdmin();

	const rows = await db.query.demoLink.findMany({
		orderBy: { createdAt: 'desc' },
		with: {
			organization: { columns: { name: true, slug: true } },
		},
	});

	const now = Date.now();
	return rows.map((row) => {
		const expired = row.expiresAt.getTime() <= now;
		const revoked = !!row.revokedAt;
		return {
			id: row.id,
			kind: row.kind,
			kindLabel: DEMO_KIND_LABEL,
			leagueName: row.organization?.name ?? 'League',
			targetName: row.organization?.name ?? 'League',
			url: absoluteDemoUrl(row.token),
			expiresAt: row.expiresAt,
			revoked,
			expired,
			active: !revoked && !expired,
			createdAt: row.createdAt,
		};
	});
});

export const createDemoLink = command(createDemoLinkSchema, async (data) => {
	const user = await requireAdmin();

	const league = await db.query.organization.findFirst({
		where: { id: data.organizationId, type: 'league' },
		columns: { id: true, slug: true, name: true },
	});
	if (!league) {
		badRequest({ resource: 'organization' }, { message: 'League not found.' });
	}

	const expiresAt = new Date(Date.now() + data.expiresInDays * 24 * 60 * 60 * 1000);
	const token = crypto.randomUUID();

	const [created] = await db
		.insert(table.demoLink)
		.values({
			token,
			kind: 'league',
			organizationId: league.id,
			playerId: null,
			teamId: null,
			createdByUserId: user.id,
			expiresAt,
			label: league.name,
		})
		.returning({ id: table.demoLink.id, token: table.demoLink.token });

	return {
		id: created.id,
		url: absoluteDemoUrl(created.token),
		expiresAt: expiresAt.toISOString(),
		kind: 'league' as const,
		kindLabel: DEMO_KIND_LABEL,
	};
});

export const revokeDemoLink = command(idOnlySchema, async ({ id }) => {
	await requireAdmin();
	await db.update(table.demoLink).set({ revokedAt: new Date() }).where(eq(table.demoLink.id, id));
	void listDemoLinks().refresh();
	return { ok: true as const };
});
