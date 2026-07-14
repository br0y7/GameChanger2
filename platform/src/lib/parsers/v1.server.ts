import {
	SpreadsheetParserError,
	type SpreadsheetParseOptions,
	type SpreadsheetParser,
} from '$lib/parsers/base';
import * as xlsx from 'xlsx';
import { applyExcelTime, convertExcelDate } from './date-time';
import {
	statKeys,
	type GamePreview,
	type PlayerGameStatsPreview,
	type StatKey,
	type TeamPreview,
} from '$lib/schemas/preview';
import { Temporal } from 'temporal-polyfill';

type Header = StatKey | 'jerseyNumber';

const ALLOWED_HEADERS = new Set<Header>([...statKeys, 'jerseyNumber']);

const HEADER_REPLACEMENTS: Record<string, Header> = {
	'3ptm': 'fg3m',
	'3pa': 'fg3a',
	'player no.': 'jerseyNumber',
};

function parseStatsRow(row: number[], headers: Header[]): PlayerGameStatsPreview {
	let jerseyNumber = '';
	const stats: Partial<PlayerGameStatsPreview['stats']> = {};

	for (let i = 0; i < headers.length; i++) {
		const header = headers[i];

		if (!ALLOWED_HEADERS.has(header)) {
			continue;
		}

		if (header === 'jerseyNumber') {
			jerseyNumber = row[i].toString();
			continue;
		}

		stats[header] = row[i];
	}

	return {
		jerseyNumber,
		stats: stats as PlayerGameStatsPreview['stats'],
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
	}) as (string | number)[][];

	let gameTime = Temporal.Now.zonedDateTimeISO();

	const teams: TeamPreview[] = [];
	let currentTeam: TeamPreview | null = null;
	let currentHeaders: Header[] = [];
	let isReadingStats = false;

	for (const row of rows) {
		const [first, second] = row;

		// Can't do !first, might skip 0 (a valid jersey number)
		if (first === undefined || first === null) {
			continue;
		}

		const firstLowerText = first.toString().toLowerCase();

		if (firstLowerText.startsWith('date') && !isReadingStats) {
			gameTime = convertExcelDate(second as number, options.timeZone);
			continue;
		}

		if (firstLowerText.startsWith('time') && !isReadingStats) {
			gameTime = applyExcelTime(gameTime, second as number);
			continue;
		}

		if (firstLowerText.startsWith('category') && !isReadingStats) {
			isReadingStats = true;
			continue;
		}

		if (!isReadingStats) {
			continue;
		}

		if (typeof first === 'string' && firstLowerText.startsWith('player no')) {
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

		const playerStats = parseStatsRow(row as number[], currentHeaders);
		currentTeam?.playerStats.push(playerStats);
	}

	if (teams.length <= 0) {
		throw new SpreadsheetParserError('teams was empty');
	}

	const [homeTeam, awayTeam] = teams;

	return { name: gameName, completedAt: new Date(gameTime.epochMilliseconds), homeTeam, awayTeam };
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
