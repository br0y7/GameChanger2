export type RosterIdentity = {
	id: string;
	name: string;
	jerseyNumber: string;
	teamId: string;
	gamesPlayed: number;
	userId?: string | null;
};

export type GhostRosterMatch = {
	ghostId: string;
	keeperId: string;
};

/** "Player #5" is an import placeholder, not a renamed person. */
export function isPlaceholderPlayerName(name: string): boolean {
	return /^player\s*#?\s*\d+$/i.test(name.trim());
}

export function normalizeRosterName(name: string): string {
	return name
		.trim()
		.toLowerCase()
		.replace(/[.'`]/g, '')
		.replace(/[^a-z0-9]+/g, ' ')
		.trim()
		.replace(/\s+/g, ' ');
}

export function jerseyMatchKey(jerseyNumber: string): string {
	const trimmed = jerseyNumber.trim();
	if (/^0+$/.test(trimmed)) return '0';
	return trimmed.replace(/^0+/, '') || '0';
}

function isWeakRosterName(name: string): boolean {
	return normalizeRosterName(name).split(' ').filter(Boolean).length < 2;
}

/**
 * 0-GP copies of a name that already has games on another team in the same
 * division. Single-token nicknames also need the same jersey so "Ty" on two
 * teams is left alone.
 */
export function ghostRosterMatches(players: RosterIdentity[]): GhostRosterMatch[] {
	const byName = new Map<string, RosterIdentity[]>();
	for (const player of players) {
		if (isPlaceholderPlayerName(player.name)) continue;
		const key = normalizeRosterName(player.name);
		if (!key) continue;
		const list = byName.get(key) ?? [];
		list.push(player);
		byName.set(key, list);
	}

	const matches: GhostRosterMatch[] = [];
	for (const copies of byName.values()) {
		if (copies.length < 2) continue;
		const teams = new Set(copies.map((copy) => copy.teamId));
		if (teams.size < 2) continue;

		for (const copy of copies) {
			if (copy.gamesPlayed > 0) continue;
			const keepers = copies
				.filter(
					(other) =>
						other.id !== copy.id &&
						other.teamId !== copy.teamId &&
						other.gamesPlayed > 0 &&
						(!isWeakRosterName(copy.name) ||
							jerseyMatchKey(other.jerseyNumber) === jerseyMatchKey(copy.jerseyNumber))
				)
				.sort((a, b) => b.gamesPlayed - a.gamesPlayed);
			const keeper = keepers[0];
			if (!keeper) continue;
			if (copy.userId && keeper.userId && copy.userId !== keeper.userId) continue;
			matches.push({ ghostId: copy.id, keeperId: keeper.id });
		}
	}
	return matches;
}
