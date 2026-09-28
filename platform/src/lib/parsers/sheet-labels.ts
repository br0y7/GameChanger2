import type { GameType } from '$lib/schemas/game';
import { rawStatKeys } from '$lib/schemas/player-game-stat';

const RAW_STATS = new Set<string>(rawStatKeys);

/** Spreadsheet column that records points without a shot breakdown. */
export function isPointsColumn(header: unknown) {
	if (typeof header !== 'string') return false;
	const normalized = header
		.trim()
		.toLowerCase()
		.replace(/[.\s]+/g, '');
	return normalized === 'pts' || normalized === 'points' || normalized === 'point';
}

/** A sheet that lists points and no other box-score columns. */
export function isPointsOnlyHeaders(headers: readonly unknown[]) {
	let sawPoints = false;
	for (const header of headers) {
		if (typeof header !== 'string' || header.trim() === '' || header === 'jerseyNumber') continue;
		if (isPointsColumn(header)) {
			sawPoints = true;
			continue;
		}
		if (RAW_STATS.has(header)) return false;
	}
	return sawPoints;
}

/** The label that introduces the game type, eg. "Game Type", "Type of Game" or "Type:". */
export function isGameTypeLabel(label: string) {
	const normalized = label
		.trim()
		.toLowerCase()
		.replace(/[_-]+/g, ' ')
		.replace(/\s+/g, ' ')
		.replace(/:$/, '')
		.trim();

	return (
		normalized.includes('game type') ||
		normalized === 'gametype' ||
		normalized === 'type' ||
		normalized.startsWith('type of game')
	);
}

export function parseGameTypeLabel(value: unknown): GameType | null {
	if (value === undefined || value === null || String(value).trim() === '') {
		return 'regular';
	}

	const normalized = String(value).trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');

	// Semis before a plain "playoff" check so "Playoff Semis" and "Winners Bracket Semis" are not regular season.
	if (normalized.includes('semi')) return 'semifinal';

	if (normalized === 'playoff' || normalized === 'playoffs' || /\bplayoffs?\b/.test(normalized)) {
		return 'playoff';
	}

	if (
		normalized === 'finals' ||
		normalized === 'final' ||
		normalized === 'championship' ||
		normalized === 'championship game' ||
		/\b(finals?|championship)\b/.test(normalized)
	) {
		return 'finals';
	}

	if (
		normalized === 'third place' ||
		normalized === '3rd place' ||
		normalized === 'third' ||
		normalized === '3rd' ||
		normalized.includes('third place') ||
		normalized.includes('3rd place')
	) {
		return 'third_place';
	}

	if (
		normalized === 'regular' ||
		normalized === 'normal' ||
		normalized === 'season' ||
		normalized === 'regular season' ||
		normalized.startsWith('regular season')
	) {
		return 'regular';
	}

	return null;
}

/** A plain "Playoff" label is sharpened by a sheet name like "Blue vs Red Semis". */
export function refineGameTypeWithName(gameType: GameType, gameName: string): GameType {
	if (gameType !== 'playoff') return gameType;

	const fromName = parseGameTypeLabel(gameName);
	if (fromName === 'semifinal' || fromName === 'third_place' || fromName === 'finals') {
		return fromName;
	}

	return gameType;
}
