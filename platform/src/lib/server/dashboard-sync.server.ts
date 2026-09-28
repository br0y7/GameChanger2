import { getRequestEvent } from '$app/server';
import { db } from '$lib/server/db';

export type PlayerDisplayChange = {
	playerId: string;
	teamId: string | null;
	seasonId: string | null;
	organizationId: string | null;
	kind: 'player' | 'note' | 'schedule';
};

type Listener = (change: PlayerDisplayChange) => void;

const listeners = new Set<Listener>();

export function isPlayerIdentityChange(
	change: PlayerDisplayChange,
	scope: {
		playerId?: string;
		teamId?: string | null;
		seasonId?: string;
		organizationId?: string;
		teamIds?: Array<string | null | undefined>;
	}
) {
	if (change.kind !== 'player') return false;
	if (scope.playerId != null && change.playerId === scope.playerId) return true;
	if (scope.teamId != null && change.teamId === scope.teamId) return true;
	if (scope.seasonId != null && change.seasonId === scope.seasonId) return true;
	if (scope.organizationId != null && change.organizationId === scope.organizationId) return true;
	if (scope.teamIds?.some((id) => id != null && change.teamId === id)) return true;
	return false;
}

function publishPlayerDisplayChange(change: PlayerDisplayChange) {
	for (const listener of [...listeners]) listener(change);
}

/** Tell open dashboards to reload schedules after a game or team change. */
export async function publishScheduleChange(seasonId: string) {
	const season = await db.query.season.findFirst({
		where: { id: seasonId },
		columns: { organizationId: true },
	});

	publishPlayerDisplayChange({
		playerId: '',
		teamId: null,
		seasonId,
		organizationId: season?.organizationId ?? null,
		kind: 'schedule',
	});
}

export function isScheduleChange(
	change: PlayerDisplayChange,
	scope: { seasonId?: string; teamId?: string | null }
) {
	if (change.kind !== 'schedule') return false;
	if (scope.seasonId != null && change.seasonId != null && scope.seasonId !== change.seasonId) {
		return false;
	}
	return true;
}

/** Tell every open dashboard that this player's name or coach note changed. */
export async function publishSavedPlayer(
	playerId: string,
	teamId: string | null | undefined,
	kind: PlayerDisplayChange['kind']
) {
	let seasonId: string | null = null;
	let organizationId: string | null = null;

	if (teamId) {
		const team = await db.query.team.findFirst({
			where: { id: teamId },
			columns: { id: true },
			with: {
				division: {
					columns: { seasonId: true },
					with: {
						season: { columns: { organizationId: true } },
					},
				},
			},
		});
		seasonId = team?.division?.seasonId ?? null;
		organizationId = team?.division?.season?.organizationId ?? null;
	}

	publishPlayerDisplayChange({
		playerId,
		teamId: teamId ?? null,
		seasonId,
		organizationId,
		kind,
	});
}

function waitForPlayerDisplayChange(
	signal: AbortSignal,
	matches: (change: PlayerDisplayChange) => boolean
) {
	return new Promise<void>((resolve) => {
		if (signal.aborted) {
			resolve();
			return;
		}

		const onChange: Listener = (change) => {
			if (!matches(change)) return;
			cleanup();
			resolve();
		};

		const onAbort = () => {
			cleanup();
			resolve();
		};

		const cleanup = () => {
			listeners.delete(onChange);
			signal.removeEventListener('abort', onAbort);
		};

		listeners.add(onChange);
		signal.addEventListener('abort', onAbort, { once: true });
	});
}

/**
 * Re-read `load` on every open dashboard whenever a matching player name or coach note is saved.
 * A change that lands while a reload is in flight is applied on the next pass.
 */
export function relayDashboard<T>(
	load: () => Promise<T>,
	relevant: (value: T, change: PlayerDisplayChange) => boolean
) {
	return (async function* () {
		const signal = getRequestEvent().request.signal;
		let value = await load();
		let pending = false;
		const mark: Listener = (change) => {
			if (relevant(value, change)) pending = true;
		};

		listeners.add(mark);
		try {
			while (!signal.aborted) {
				yield value;
				if (!pending) {
					await waitForPlayerDisplayChange(signal, (change) => relevant(value, change));
				}
				if (signal.aborted) return;
				pending = false;
				value = await load();
			}
		} finally {
			listeners.delete(mark);
		}
	})();
}
