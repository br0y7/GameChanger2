import type { GameType } from '$lib/schemas/game';
import { rawStatKeys, type RawStatKey } from '$lib/schemas/player-game-stat';
import { convertExcelDate } from './date-time';

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

const HEADER_ALIASES: Record<string, RawStatKey | 'jerseyNumber'> = {
	playerno: 'jerseyNumber',
	'playerno#': 'jerseyNumber',
	playername: 'jerseyNumber',
	jersey: 'jerseyNumber',
	jerseyno: 'jerseyNumber',
	fg: 'fgm',
	fgmade: 'fgm',
	fgm: 'fgm',
	fga: 'fga',
	fgattempt: 'fga',
	fgattempts: 'fga',
	'3pt': 'fg3m',
	'3p': 'fg3m',
	'3ptm': 'fg3m',
	'3pm': 'fg3m',
	fg3m: 'fg3m',
	'3pa': 'fg3a',
	'3pta': 'fg3a',
	fg3a: 'fg3a',
	ft: 'ftm',
	ftm: 'ftm',
	fta: 'fta',
	oreb: 'oreb',
	offensiverebounds: 'oreb',
	dreb: 'dreb',
	defensiverebounds: 'dreb',
	ast: 'ast',
	stl: 'stl',
	blk: 'blk',
	tov: 'tov',
	to: 'tov',
	pf: 'pf',
};

/** Player-stat header, including FG for FGM and 3PM / 3PA aliases. */
export function normalizeStatHeader(value: string): RawStatKey | 'jerseyNumber' | 'pts' | '' {
	if (isPointsColumn(value)) return 'pts';

	const normalized = value
		.trim()
		.toLowerCase()
		.replace(/[#.]/g, '')
		.replace(/[\s_-]+/g, '');
	if (normalized === 'playerno' || normalized === 'playername' || normalized === 'jersey') {
		return 'jerseyNumber';
	}
	return HEADER_ALIASES[normalized] ?? (RAW_STATS.has(normalized) ? (normalized as RawStatKey) : '');
}

const SHOT_PAIR = /^(\d+)\s*[-–/]\s*(\d+)$/;
const SHOT_DATE = /^(\d{1,2})[-/](\d{1,2})(?:[-/](\d{2}|\d{4}))?$/;
const SHOT_MONTH_NAME =
	/^(?:(\d{1,2})[-/\s]+([a-z]+)|([a-z]+)[-/\s]+(\d{1,2}))(?:[-/\s]+(?:\d{2}|\d{4}))?$/i;
const EXCEL_DATE_SERIAL = 80;

const MONTHS: Record<string, number> = {
	jan: 1,
	january: 1,
	feb: 2,
	february: 2,
	mar: 3,
	march: 3,
	apr: 4,
	april: 4,
	may: 5,
	jun: 6,
	june: 6,
	jul: 7,
	july: 7,
	aug: 8,
	august: 8,
	sep: 9,
	sept: 9,
	september: 9,
	oct: 10,
	october: 10,
	nov: 11,
	november: 11,
	dec: 12,
	december: 12,
};

export function parseShotPair(value: unknown): { makes: number; attempts: number } | null {
	if (value instanceof Date && !Number.isNaN(value.getTime())) {
		return shotPair(value.getUTCMonth() + 1, value.getUTCDate());
	}

	if (typeof value === 'number' && Number.isFinite(value) && value > EXCEL_DATE_SERIAL) {
		try {
			const date = convertExcelDate(value, 'UTC');
			return shotPair(date.month, date.day);
		} catch {
			return null;
		}
	}

	if (typeof value !== 'string') return null;
	const trimmed = value.trim();
	if (trimmed === '') return null;

	const pair = SHOT_PAIR.exec(trimmed);
	if (pair) return shotPair(Number(pair[1]), Number(pair[2]));

	const dated = SHOT_DATE.exec(trimmed);
	if (dated) return shotPair(Number(dated[1]), Number(dated[2]));

	const named = SHOT_MONTH_NAME.exec(trimmed);
	if (named) {
		const month = MONTHS[(named[2] ?? named[3] ?? '').toLowerCase()];
		const day = Number(named[1] ?? named[4]);
		if (month) return shotPair(month, day);
	}

	return null;
}

function shotPair(makes: number, attempts: number) {
	if (!Number.isInteger(makes) || !Number.isInteger(attempts)) return null;
	if (makes < 0 || attempts < 0) return null;
	if (attempts < makes) return null;
	if (makes > 31 || attempts > 80) return null;
	return { makes, attempts };
}
