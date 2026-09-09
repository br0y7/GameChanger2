import {
	SpreadsheetParserError,
	type SpreadsheetParseOptions,
	type SpreadsheetParser,
} from '$lib/parsers/base';
import * as xlsx from 'xlsx';
import { applyExcelTime, convertExcelDate } from './date-time';
import {
	type GamePreview,
	type PlayerGameStatsPreview,
	type StatKey,
	type TeamPreview,
} from '$lib/schemas/preview';
import { Temporal } from 'temporal-polyfill';
import { serverLogger } from '$lib/server/logger';
import { rawStatKeys } from '$lib/schemas/player-game-stat';

type Header = StatKey | 'jerseyNumber';

const ALLOWED_HEADERS = new Set<Header>([...rawStatKeys, 'jerseyNumber']);

const HEADER_REPLACEMENTS: Record<string, Header> = {
	'3ptm': 'fg3m',
	'3pa': 'fg3a',
	'player no.': 'jerseyNumber',
	'player name': 'jerseyNumber',
};

type RowValue = string | number | null | undefined;

function gameError(gameName: string, section: string, message: string, cause?: unknown) {
	return new SpreadsheetParserError(`[Game: ${gameName}] [${section}] ${message}`, { cause });
}

function parseStatNumber(value: RowValue): number {
	if (value === undefined || value === null) return 0;

	if (typeof value === 'string') {
		const trimmed = value.trim();
		if (trimmed === '') return 0;
		const parsed = Number(trimmed);
		return Number.isFinite(parsed) ? parsed : 0;
	}

	return Number.isFinite(value) ? value : 0;
}

function parseStatsRow(
	row: RowValue[],
	headers: Header[],
	gameName: string,
	teamName: string
): PlayerGameStatsPreview {
	let jerseyNumber = '';
	const stats = Object.fromEntries(rawStatKeys.map((key) => [key, 0])) as Record<
		StatKey,
		number
	>;

	for (let i = 0; i < headers.length; i++) {
		const header = headers[i];

		if (!ALLOWED_HEADERS.has(header)) {
			continue;
		}

		const value = row[i];
		if (header === 'jerseyNumber') {
			if (value === undefined || value === null || String(value).trim() === '') {
				throw gameError(
					gameName,
					`Team: ${teamName}`,
					`Missing jersey number in player row: ${JSON.stringify(row)}`
				);
			}

			jerseyNumber = value.toString().trim();
			continue;
		}

		const isBlank =
			value === undefined ||
			value === null ||
			(typeof value === 'string' && value.trim() === '');

		const statValue = parseStatNumber(value);

		if (!isBlank && typeof value === 'string' && Number.isNaN(Number(value.trim()))) {
			serverLogger.warn('non-numeric row value, defaulting to 0', {
				gameName,
				teamName,
				header,
				row,
			});
		}

		stats[header] = statValue;
	}

	return {
		jerseyNumber,
		stats,
		_status: 'new',
	};
}

function parseGameSheet(
	sheet: xlsx.Sheet,
	gameName: string,
	options: SpreadsheetParseOptions
): GamePreview {
	const rows = xlsx.utils.sheet_to_json(sheet, {
		header: 1,
		blankrows: false,
	}) as RowValue[][];

	let gameTime = Temporal.Now.zonedDateTimeISO();

	const teams: TeamPreview[] = [];
	let currentTeam: TeamPreview | null = null;
	let currentHeaders: Header[] = [];
	let isReadingStats = false;

	try {
		for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
			const row = rows[rowIndex];
			const excelRow = rowIndex + 1;
			const [first, second] = row;

			// Can't do !first, might skip 0 (a valid jersey number)
			if (first === undefined || first === null) {
				continue;
			}

			const firstLowerText = first.toString().toLowerCase();

			if (firstLowerText.startsWith('date') && !isReadingStats) {
				try {
					gameTime = convertExcelDate(second as number, options.timeZone);
				} catch (err) {
					throw gameError(
						gameName,
						`Date row (Excel row ${excelRow})`,
						err instanceof Error ? err.message : 'Invalid date',
						err
					);
				}
				continue;
			}

			if (firstLowerText.startsWith('time') && !isReadingStats) {
				try {
					gameTime = applyExcelTime(gameTime, second as number);
				} catch (err) {
					throw gameError(
						gameName,
						`Time row (Excel row ${excelRow})`,
						err instanceof Error ? err.message : 'Invalid time',
						err
					);
				}
				continue;
			}

			if (firstLowerText.startsWith('category') && !isReadingStats) {
				isReadingStats = true;
				continue;
			}

			if (!isReadingStats) {
				continue;
			}

			if (
				typeof first === 'string' &&
				(firstLowerText.startsWith('player no') || firstLowerText.startsWith('player name'))
			) {
				if (!row.every((h) => typeof h === 'string')) {
					throw gameError(
						gameName,
						`Header row (Excel row ${excelRow})`,
						`Invalid headers: ${JSON.stringify(row)}`
					);
				}

				currentHeaders = row
					.map((v) => v.toString().toLowerCase())
					.map((h) => HEADER_REPLACEMENTS[h] ?? h);
				continue;
			}

			if (typeof first === 'string') {
				currentTeam = {
					name: first.toString(),
					score: Number(second) || 0,
					playerStats: [],
					_status: 'new',
				};

				teams.push(currentTeam);

				continue;
			}

			if (!currentTeam) {
				throw gameError(
					gameName,
					`Excel row ${excelRow}`,
					`Found player stats before a team name row: ${JSON.stringify(row)}`
				);
			}

			if (currentHeaders.length === 0) {
				throw gameError(
					gameName,
					`Team: ${currentTeam.name} (Excel row ${excelRow})`,
					`Missing "Player No." / "Player Name" header before player stats`
				);
			}

			const playerStats = parseStatsRow(row, currentHeaders, gameName, currentTeam.name);
			currentTeam.playerStats.push(playerStats);
		}

		if (teams.length <= 0) {
			throw gameError(gameName, 'Teams', 'No teams found on this sheet');
		}

		if (teams.length < 2) {
			throw gameError(
				gameName,
				'Teams',
				`Expected home and away teams, only found: ${teams.map((t) => t.name).join(', ')}`
			);
		}

		const [homeTeam, awayTeam] = teams;

		return { name: gameName, completedAt: new Date(gameTime.epochMilliseconds), homeTeam, awayTeam };
	} catch (err) {
		if (err instanceof SpreadsheetParserError) {
			throw err;
		}

		throw gameError(
			gameName,
			'Sheet',
			err instanceof Error ? err.message : 'Unknown parse error',
			err
		);
	}
}

const parse: SpreadsheetParser['parse'] = (workbook, options) => {
	const sheetNames = workbook.SheetNames.filter((s) => s.toLowerCase() !== 'acronyms');

	const games: GamePreview[] = [];
	for (const name of sheetNames) {
		games.push(parseGameSheet(workbook.Sheets[name], name, options));
	}

	return { games, version: 'v1' };
};

export const spreadsheetParserV1: SpreadsheetParser = { version: 'v1', parse };
