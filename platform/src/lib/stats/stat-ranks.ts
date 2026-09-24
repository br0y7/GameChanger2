export const rankedStatKeys = [
	'points',
	'rebounds',
	'assists',
	'steals',
	'blocks',
	'oreb',
	'dreb',
	'threes',
	'fts',
	'fg',
	'fg3',
	'ft',
	'ts',
] as const;

export type RankedStatKey = (typeof rankedStatKeys)[number];

/** Badges and assistant lists only include this range. */
export const rankListLimit = 10;

export type RankPlace = {
	place: number;
	tied: boolean;
};

export type StatRank = {
	division: RankPlace | null;
	league: RankPlace | null;
};

export type RankRow = {
	id: string;
	divisionId: string;
	values: Partial<Record<RankedStatKey, number>>;
};

/** Match the number shown on the card so players who look equal share one rank. */
export function displayRankValue(key: RankedStatKey, value: number) {
	if (key === 'fg' || key === 'fg3' || key === 'ft' || key === 'ts') {
		return Math.round(value * 1000) / 1000;
	}
	return Math.round(value * 10) / 10;
}

/** Competition place. Tied players share a place. `limit` drops anyone outside that range. */
export function placeInGroup(
	rows: { id: string; value: number }[],
	playerId: string,
	limit?: number
): RankPlace | null {
	const sorted = [...rows].sort((a, b) => b.value - a.value || a.id.localeCompare(b.id));
	const valueCounts = new Map<number, number>();
	for (const row of sorted) valueCounts.set(row.value, (valueCounts.get(row.value) ?? 0) + 1);

	let rank = 0;
	let seen = 0;
	let previous: number | null = null;

	for (const row of sorted) {
		seen += 1;
		if (previous === null || row.value !== previous) rank = seen;
		previous = row.value;
		if (row.id !== playerId) continue;
		if (limit != null && rank > limit) return null;
		return { place: rank, tied: (valueCounts.get(row.value) ?? 0) > 1 };
	}

	return null;
}

export function formatRankPlace(place: RankPlace) {
	return place.tied ? `T - ${place.place}` : `#${place.place}`;
}

/** Players whose shared rank is inside the top `limit`, highest value first. */
export function rankedLeaders<T extends { id: string; value: number }>(rows: T[], limit = rankListLimit) {
	const sorted = [...rows].sort((a, b) => b.value - a.value || a.id.localeCompare(b.id));
	const valueCounts = new Map<number, number>();
	for (const row of sorted) valueCounts.set(row.value, (valueCounts.get(row.value) ?? 0) + 1);

	let rank = 0;
	let seen = 0;
	let previous: number | null = null;
	const leaders: (T & RankPlace)[] = [];

	for (const row of sorted) {
		seen += 1;
		if (previous === null || row.value !== previous) rank = seen;
		previous = row.value;
		if (rank > limit) break;
		leaders.push({ ...row, place: rank, tied: (valueCounts.get(row.value) ?? 0) > 1 });
	}

	return leaders;
}

export function ranksForPlayer(rows: RankRow[], playerId: string, divisionId: string) {
	const ranks: Partial<Record<RankedStatKey, StatRank>> = {};

	for (const key of rankedStatKeys) {
		const eligible = rows.filter((row) => row.values[key] != null);
		const league = placeInGroup(
			eligible.map((row) => ({ id: row.id, value: displayRankValue(key, row.values[key]!) })),
			playerId,
			rankListLimit
		);
		const division = placeInGroup(
			eligible
				.filter((row) => row.divisionId === divisionId)
				.map((row) => ({ id: row.id, value: displayRankValue(key, row.values[key]!) })),
			playerId,
			rankListLimit
		);

		if (division != null || league != null) {
			ranks[key] = { division, league };
		}
	}

	return ranks;
}
