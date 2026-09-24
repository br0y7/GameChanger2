import type { GameType } from '$lib/schemas/game';
import { rawStatKeys } from '$lib/schemas/player-game-stat';

const RAW_STATS = new Set<string>(rawStatKeys);

/** Spreadsheet column that records points without a shot breakdown. */
export function isPointsColumn(header: string) {
	const normalized = header.trim().toLowerCase().replace(/[.\s]+/g, '');
	return normalized === 'pts' || normalized === 'points' || normalized === 'point';
}

/** A sheet that lists points and no other box-score columns. */
export function isPointsOnlyHeaders(headers: readonly string[]) {
	let sawPoints = false;
	for (const header of headers) {
		if (header === 'jerseyNumber') continue;
		if (isPointsColumn(header)) {
			sawPoints = true;
			continue;
		}
		if (RAW_STATS.has(header)) return false;
	}
	return sawPoints;
}

export function parseGameTypeLabel(value: unknown): GameType | null {
	if (value === undefined || value === null || String(value).trim() === '') {
		return 'regular';
	}

	const normalized = String(value)
		.trim()
		.toLowerCase()
		.replace(/[_-]+/g, ' ')
		.replace(/\s+/g, ' ');

	if (normalized === 'playoff' || normalized === 'playoffs') return 'playoff';

	if (
		normalized === 'finals' ||
		normalized === 'final' ||
		normalized === 'championship' ||
		normalized === 'championship game'
	) {
		return 'finals';
	}

	if (
		normalized === 'third place' ||
		normalized === '3rd place' ||
		normalized === 'third' ||
		normalized === '3rd'
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
