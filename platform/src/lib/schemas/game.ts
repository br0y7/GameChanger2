export const gameTypes = ['regular', 'playoff', 'finals', 'third_place', 'semifinal'] as const;

export type GameType = (typeof gameTypes)[number];

/** Spreadsheet labels like "Regular Season" map to enum `regular`. */
export function isRegularSeasonGameType(type: GameType | string | null | undefined): boolean {
	return type === 'regular' || type == null;
}

export function isPostseasonGameType(type: GameType | string | null | undefined) {
	return type === 'playoff' || type === 'semifinal' || type === 'finals' || type === 'third_place';
}

/**
 * Game type for a re-imported game.
 * A stored postseason type outranks a type guessed from a sheet name, so re-importing a sheet
 * that never mentions the type leaves a playoff game alone. A sheet with a Game Type row is a
 * deliberate statement and wins, which is the only way to correct a wrongly typed postseason game.
 */
export function resolveImportedGameType(
	storedType: GameType | string | null | undefined,
	incomingType: GameType,
	incomingIsExplicit: boolean
): GameType {
	if (incomingIsExplicit) return incomingType;
	if (isPostseasonGameType(storedType)) return storedType as GameType;
	return incomingType;
}

export type DefaultLossSide = 'home' | 'away';

/** Label for the team on this side of a default-loss game. */
export function defaultResultLabel(
	side: string | null | undefined,
	isHome: boolean
): 'Default lose' | 'Default win' | null {
	if (side !== 'home' && side !== 'away') return null;
	const teamDefaultLost = (side === 'home' && isHome) || (side === 'away' && !isHome);
	return teamDefaultLost ? 'Default lose' : 'Default win';
}

/**
 * A default is a forfeit sheet: no box score, one side marked Default Lose.
 * A points-only game still has a real point total, so it is not a default.
 */
export function isDefaultGame(game: {
	statsAvailable?: boolean | null;
	defaultLossSide?: string | null;
	pointsOnly?: boolean | null;
}) {
	if (game.pointsOnly) return false;
	if (game.statsAvailable !== false) return false;
	return game.defaultLossSide === 'home' || game.defaultLossSide === 'away';
}

/** Finished-game line: the point total, a real default, or Win / Lose when no points were recorded. */
export function completedGameLabel(input: {
	statsAvailable?: boolean | null;
	defaultLossSide?: string | null;
	pointsOnly?: boolean | null;
	isHome: boolean;
	result: string | null;
	teamScore: number | null;
	oppScore: number | null;
}): string | null {
	if (input.result == null && input.teamScore == null) return null;
	if (isDefaultGame(input)) return defaultResultLabel(input.defaultLossSide, input.isHome);
	const hasPointTotal = input.pointsOnly || input.statsAvailable !== false;
	if (hasPointTotal && input.teamScore != null && input.oppScore != null) {
		return input.result
			? `${input.result} ${input.teamScore}–${input.oppScore}`
			: `${input.teamScore}–${input.oppScore}`;
	}
	return input.result;
}

/** Result-only games show Win / Lose, or Default win / Default lose, instead of a point total. */
export function resultOnlyOutcome(
	defaultLossSide: string | null | undefined,
	isHome: boolean,
	teamScore: number | null | undefined,
	opponentScore: number | null | undefined
): 'Default lose' | 'Default win' | 'Win' | 'Lose' {
	const labeled = defaultResultLabel(defaultLossSide, isHome);
	if (labeled) return labeled;
	return (teamScore ?? 0) > (opponentScore ?? 0) ? 'Win' : 'Lose';
}

export function gameTypeLabel(type: GameType | string | null | undefined): string {
	switch (type) {
		case 'playoff':
			return 'Playoff';
		case 'semifinal':
			return 'Playoffs Semis';
		case 'finals':
			return 'Finals';
		case 'third_place':
			return 'Third Place';
		case 'regular':
		default:
			return 'Regular Season';
	}
}

/** Game-log date: "Oct 4, 2026", or TBD when the sheet has no date. */
export function formatGameLogDate(value: Date | string | null | undefined): string {
	if (value == null || value === '') return 'TBD';
	const date = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(date.getTime())) return 'TBD';
	return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Text color for a game-type label on the dark dashboard. */
export function gameTypeClass(type: GameType | string | null | undefined): string {
	switch (type) {
		case 'finals':
			return 'text-[#A371F7]';
		case 'third_place':
			return 'text-[#56D4DD]';
		case 'semifinal':
			return 'text-[#F0883E]';
		case 'playoff':
			return 'text-[#F0A020]';
		default:
			return 'text-[#8B949E]';
	}
}
