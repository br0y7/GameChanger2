export const gameTypes = ['regular', 'playoff', 'finals'] as const;

export type GameType = (typeof gameTypes)[number];

/** Spreadsheet labels like "Regular Season" map to enum `regular`. */
export function isRegularSeasonGameType(type: GameType | string | null | undefined): boolean {
	return type === 'regular' || type == null;
}

export function gameTypeLabel(type: GameType | string | null | undefined): string {
	switch (type) {
		case 'playoff':
			return 'Playoff';
		case 'finals':
			return 'Finals';
		case 'regular':
		default:
			return 'Regular Season';
	}
}
