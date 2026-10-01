import { calendarDay } from '$lib/import/game-identity';
import { isPostseasonGameType } from '$lib/schemas/game';

/** Enough of a game row to tell whether two listings are the same matchup. */
export type MatchupIdentity = {
	id: string;
	homeTeamId: string;
	awayTeamId: string;
	gameType?: string | null;
	status?: string | null;
	statsAvailable?: boolean | null;
	homeTeamScore?: number | null;
	awayTeamScore?: number | null;
	completedAt?: Date | string | null;
	scheduledAt?: Date | string | null;
};

/** Same two teams on the same day are one game, regardless of which side is listed as home. */
export function matchupKey(game: MatchupIdentity) {
	const day = calendarDay(game.completedAt ?? game.scheduledAt);
	if (!day) return `id:${game.id}`;
	const teams = [game.homeTeamId, game.awayTeamId].sort().join('|');
	return `${day}|${teams}`;
}

function pairKey(homeTeamId: string, awayTeamId: string) {
	return [homeTeamId, awayTeamId].sort().join('|');
}

function gameAt(game: MatchupIdentity) {
	const value = game.completedAt ?? game.scheduledAt;
	if (value == null) return 0;
	return value instanceof Date ? value.getTime() : new Date(value).getTime();
}

/**
 * A Playoff label against a team they later meet in semis, finals, or third place
 * is the regular-season rematch, not a playoff game.
 */
export function correctFalsePlayoffTypes<T extends MatchupIdentity>(games: T[]): T[] {
	const laterRoundByPair = new Map<string, number>();
	for (const game of games) {
		if (
			game.gameType !== 'semifinal' &&
			game.gameType !== 'finals' &&
			game.gameType !== 'third_place'
		) {
			continue;
		}
		const key = pairKey(game.homeTeamId, game.awayTeamId);
		const at = gameAt(game);
		const previous = laterRoundByPair.get(key) ?? 0;
		if (at > previous) laterRoundByPair.set(key, at);
	}

	return games.map((game) => {
		if (game.gameType !== 'playoff') return game;
		const laterRound = laterRoundByPair.get(pairKey(game.homeTeamId, game.awayTeamId));
		if (laterRound == null || gameAt(game) >= laterRound) return game;
		return { ...game, gameType: 'regular' };
	});
}

function richness(game: MatchupIdentity) {
	let score = 0;
	if (game.status === 'completed') score += 8;
	if (game.statsAvailable !== false) score += 4;
	if ((game.homeTeamScore ?? 0) + (game.awayTeamScore ?? 0) > 0) score += 2;
	if (isPostseasonGameType(game.gameType)) score += 1;
	return score;
}

/**
 * Collapse duplicate listings of one matchup.
 * A regular-season copy of a playoff game is dropped so it cannot inflate the pre-playoff record.
 */
export function dedupeMatchups<T extends MatchupIdentity>(games: T[]): T[] {
	const groups = new Map<string, T[]>();
	for (const game of games) {
		const key = matchupKey(game);
		const group = groups.get(key);
		if (group) group.push(game);
		else groups.set(key, [game]);
	}

	const kept: T[] = [];
	for (const group of groups.values()) {
		if (group.length === 1) {
			kept.push(group[0]);
			continue;
		}
		const postseason = group.filter((game) => isPostseasonGameType(game.gameType));
		const pool = postseason.length ? postseason : group;
		pool.sort((a, b) => richness(b) - richness(a));
		kept.push(pool[0]);
	}
	return kept;
}

/** Keep one stat line per matchup. Items whose game is missing are left as they are. */
export function dedupeByMatchup<T>(
	items: T[],
	gameOf: (item: T) => MatchupIdentity | null | undefined
) {
	const seenGameIds = new Set<string>();
	const uniqueItems = items.filter((item) => {
		const game = gameOf(item);
		if (!game) return true;
		if (seenGameIds.has(game.id)) return false;
		seenGameIds.add(game.id);
		return true;
	});
	const linked = uniqueItems.flatMap((item) => {
		const game = gameOf(item);
		return game ? [{ item, game }] : [];
	});
	const keptIds = new Set(dedupeMatchups(linked.map((row) => row.game)).map((game) => game.id));
	return uniqueItems.filter((item) => {
		const game = gameOf(item);
		if (!game) return true;
		return keptIds.has(game.id);
	});
}
