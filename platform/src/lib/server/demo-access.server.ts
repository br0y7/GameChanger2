import { getRequestEvent } from '$app/server';
import { resolve } from '$app/paths';
import type { DemoLinkKind } from '$lib/schemas/demo';
import { db } from '$lib/server/db';

export const DEMO_ACCESS_COOKIE = 'demo_access';

export type DemoAccess = {
	id: string;
	token: string;
	kind: DemoLinkKind;
	organizationId: string;
	orgSlug: string;
	orgName: string;
	playerId: string | null;
	playerName: string | null;
	teamId: string | null;
	teamName: string | null;
	expiresAt: Date;
};

type DemoCookies = {
	get: (name: string) => string | undefined;
	set: (
		name: string,
		value: string,
		opts: {
			path: string;
			httpOnly: boolean;
			sameSite: 'lax';
			secure: boolean;
			expires: Date;
		}
	) => void;
	delete: (name: string, opts: { path: string }) => void;
};

const COOKIE_PATH = { path: '/' } as const;

export function demoDashboardPath(access: Pick<DemoAccess, 'orgSlug'>) {
	return resolve('/dashboard/[orgSlug]', { orgSlug: access.orgSlug });
}

export function writeDemoAccessCookie(
	cookies: DemoCookies,
	token: string,
	expiresAt: Date,
	secure: boolean
) {
	cookies.set(DEMO_ACCESS_COOKIE, token, {
		...COOKIE_PATH,
		httpOnly: true,
		sameSite: 'lax',
		secure,
		expires: expiresAt,
	});
}

export function clearDemoAccessCookie(cookies: DemoCookies) {
	cookies.delete(DEMO_ACCESS_COOKIE, COOKIE_PATH);
}

export async function loadDemoAccessByToken(token: string): Promise<DemoAccess | null> {
	if (!isUuid(token)) return null;

	const row = await db.query.demoLink.findFirst({
		where: { token },
		with: {
			organization: { columns: { id: true, slug: true, name: true } },
			player: { columns: { id: true, name: true } },
			team: { columns: { id: true, name: true } },
		},
	});

	if (!row?.organization || row.revokedAt) return null;
	if (row.expiresAt.getTime() <= Date.now()) return null;

	return {
		id: row.id,
		token: row.token,
		kind: row.kind,
		organizationId: row.organizationId,
		orgSlug: row.organization.slug,
		orgName: row.organization.name,
		playerId: row.playerId,
		playerName: row.player?.name ?? null,
		teamId: row.teamId,
		teamName: row.team?.name ?? null,
		expiresAt: row.expiresAt,
	};
}

function isUuid(value: string) {
	return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function getValidDemoAccess(): Promise<DemoAccess | null> {
	const event = getRequestEvent();
	if (event.locals.demoAccess !== undefined) {
		return event.locals.demoAccess;
	}

	const token = event.cookies.get(DEMO_ACCESS_COOKIE);
	if (!token) {
		event.locals.demoAccess = null;
		return null;
	}

	const access = await loadDemoAccessByToken(token);
	if (!access) {
		event.locals.demoAccess = null;
		try {
			clearDemoAccessCookie(event.cookies);
		} catch {
			// Queries cannot mutate cookies; leave a stale value until a command/load clears it.
		}
		return null;
	}

	event.locals.demoAccess = access;
	return access;
}

export async function demoCanViewLeague(organizationId: string): Promise<boolean> {
	const demo = await getValidDemoAccess();
	return !!demo && demo.organizationId === organizationId;
}

export async function demoCanViewFamilyPlayer(playerId: string): Promise<boolean> {
	const demo = await getValidDemoAccess();
	if (!demo) return false;

	const player = await db.query.player.findFirst({
		where: { id: playerId },
		columns: { id: true },
		with: {
			team: {
				columns: { id: true },
				with: {
					division: {
						columns: { id: true },
						with: { season: { columns: { organizationId: true } } },
					},
				},
			},
		},
	});
	return player?.team?.division?.season?.organizationId === demo.organizationId;
}

export async function demoCanViewTeam(teamId: string): Promise<boolean> {
	const demo = await getValidDemoAccess();
	if (!demo) return false;

	const team = await db.query.team.findFirst({
		where: { id: teamId },
		columns: { id: true },
		with: {
			division: {
				columns: { id: true },
				with: { season: { columns: { organizationId: true } } },
			},
		},
	});
	return team?.division?.season?.organizationId === demo.organizationId;
}
