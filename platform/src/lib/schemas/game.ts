export const gameTypes = ['regular', 'playoff', 'finals', 'third_place', 'semifinal'] as const;

export type GameType = (typeof gameTypes)[number];

/** Spreadsheet labels like "Regular Season" map to enum `regular`. */
export function isRegularSeasonGameType(type: GameType | string | null | undefined): boolean {
	return type === 'regular' || type == null;
}

export function isPostseasonGameType(type: GameType | string | null | undefined) {
	return type === 'playoff' || type === 'semifinal' || type === 'finals' || type === 'third_place';
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
