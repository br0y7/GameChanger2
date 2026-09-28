import {
	SpreadsheetParserError,
	type SpreadsheetParseOptions,
	type SpreadsheetParser,
} from '$lib/parsers/base';
import * as xlsx from 'xlsx';
import { applySheetTime, parseSheetDate } from './date-time';
import {
	type GamePreview,
	type PlayerGameStatsPreview,
	type StatKey,
	type TeamPreview,
} from '$lib/schemas/preview';
import type { GameType } from '$lib/schemas/game';
import {
	isGameTypeLabel,
	isPointsColumn,
	isPointsOnlyHeaders,
	parseGameTypeLabel,
	refineGameTypeWithName,
} from '$lib/parsers/sheet-labels';
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

function parseGameType(value: RowValue, gameName: string, excelRow: number): GameType {
	const parsed = parseGameTypeLabel(value);
	if (parsed) return parsed;

	throw gameError(
		gameName,
		`Game Type row (Excel row ${excelRow})`,
		`Unknown Game Type "${value}". Use Regular Season, Playoff, Playoffs Semis, Finals, or Third Place.`
	);
}

/** Labelled rows come as "Date: 2026-08-23" in one cell, or "Date" and the value in two. */
function labelledValue(first: RowValue, second: RowValue, label: RegExp): RowValue {
	if (second !== undefined && second !== null && String(second).trim() !== '') return second;
	return String(first).replace(label, '').trim();
}

/** Parse the cell beside the team name: a number, or Win/Lose/Default Lose when no stats exist. */
function parseTeamScoreCell(
	value: RowValue,
	gameName: string,
	teamName: string,
	excelRow: number
):
	| { kind: 'points'; score: number }
	| { kind: 'result'; result: 'win' | 'lose' | 'default_lose'; score: number } {
	if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
		return { kind: 'points', score: 0 };
	}

	if (typeof value === 'number' && Number.isFinite(value)) {
		return { kind: 'points', score: value };
	}

	const normalized = String(value).trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');

	if (normalized === 'win' || normalized === 'won' || normalized === 'w') {
		return { kind: 'result', result: 'win', score: 1 };
	}

	if (
		normalized === 'default lose' ||
		normalized === 'default loss' ||
		normalized === 'default lost' ||
		normalized === 'default forfeit' ||
		normalized === 'forfeit' ||
		normalized === 'dl'
	) {
		return { kind: 'result', result: 'default_lose', score: 0 };
	}

	if (
		normalized === 'lose' ||
		normalized === 'loss' ||
		normalized === 'lost' ||
		normalized === 'l'
	) {
		return { kind: 'result', result: 'lose', score: 0 };
	}

	const asNumber = Number(normalized);
	if (Number.isFinite(asNumber) && normalized !== '') {
		return { kind: 'points', score: asNumber };
	}

	throw gameError(
		gameName,
		`Team: ${teamName} (Excel row ${excelRow})`,
		`Invalid score "${value}". Use a number, or Win / Lose / Default Lose when stats are unavailable.`
	);
}

function isPlayerHeaderRow(value: RowValue): boolean {
	if (typeof value !== 'string') return false;
	const lowered = value.toLowerCase();
	return lowered.startsWith('player no') || lowered.startsWith('player name');
}

/** The next row carrying something in column A, which is where names and labels live. */
function nextLabelledRow(rows: RowValue[][], fromIndex: number): RowValue[] | null {
	for (let i = fromIndex + 1; i < rows.length; i++) {
		const first = rows[i]?.[0];
		if (first === undefined || first === null) continue;
		if (typeof first === 'string' && first.trim() === '') continue;
		return rows[i] ?? null;
	}
	return null;
}

/**
 * A team name in column A carries either its score beside it or its player header underneath.
 * Notes typed into column A ("No Footage", "missing some footage...") carry neither, and reading
 * one as a team costs the game a real side: the note takes the slot and an opponent is dropped.
 */
function isTeamNameRow(rows: RowValue[][], rowIndex: number): boolean {
	const beside = rows[rowIndex]?.[1];
	if (beside !== undefined && beside !== null && String(beside).trim() !== '') return true;

	return isPlayerHeaderRow(nextLabelledRow(rows, rowIndex)?.[0]);
}

function gameError(gameName: string, section: string, message: string, cause?: unknown) {
	return new SpreadsheetParserError(`Game: ${gameName} — ${section} — ${message}`, { cause });
}

function formatPlayedOn(zoned: Temporal.ZonedDateTime): string {
	return zoned.toPlainDate().toLocaleString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
	});
}

function withPlayedOn(message: string, gameName: string, playedOn?: string) {
	if (!playedOn) return message;
	const prefix = `Game: ${gameName}`;
	const dated = `${prefix} — ${playedOn}`;
	if (!message.startsWith(prefix) || message.startsWith(dated)) return message;
	return `${dated}${message.slice(prefix.length)}`;
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

/** "00" and "04" are text in Excel so a leading zero survives. They are jersey numbers. */
function isJerseyNumberLabel(value: string): boolean {
	return /^\d+$/.test(value.trim());
}

function parseStatsRow(
	row: RowValue[],
	headers: Header[],
	gameName: string,
	teamName: string,
	pointsOnly: boolean
): PlayerGameStatsPreview {
	let jerseyNumber = '';
	let recordedPts: number | null = pointsOnly ? 0 : null;
	let sawPointsColumn = false;
	let pointsFromColumn = 0;
	const stats = Object.fromEntries(rawStatKeys.map((key) => [key, 0])) as Record<StatKey, number>;

	for (let i = 0; i < headers.length; i++) {
		const header = headers[i];
		if (typeof header !== 'string' || header.trim() === '') continue;

		if (isPointsColumn(header)) {
			sawPointsColumn = true;
			pointsFromColumn = parseStatNumber(row[i]);
			if (pointsOnly) {
				recordedPts = pointsFromColumn;
				continue;
			}
		}

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
			value === undefined || value === null || (typeof value === 'string' && value.trim() === '');

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

	// A full header row with only the points cells filled is still points-only (no footage).
	if (!pointsOnly && sawPointsColumn && rawStatKeys.every((key) => stats[key] === 0)) {
		recordedPts = pointsFromColumn;
	}

	return {
		jerseyNumber,
		stats,
		recordedPts,
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
	let playedOn = '';
	let gameType: GameType = 'regular';
	let sawExplicitGameType = false;
	let looseGameType: GameType | null = null;

	const teams: TeamPreview[] = [];
	let currentTeam: TeamPreview | null = null;
	let currentHeaders: Header[] = [];
	let currentPointsOnly = false;
	let isReadingStats = false;
	let resultOnlyGame = false;
	const teamResults: Array<'win' | 'lose' | 'default_lose' | null> = [];

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
					gameTime = parseSheetDate(
						labelledValue(first, second, /^date\s*:?\s*/i),
						options.timeZone
					);
					playedOn = formatPlayedOn(gameTime);
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
				const value = labelledValue(first, second, /^time\s*:?\s*/i);
				// Time row is optional: missing/blank values are ignored (date-only is fine).
				if (value === undefined || value === null || String(value).trim() === '') {
					continue;
				}
				try {
					gameTime = applySheetTime(gameTime, value);
				} catch (err) {
					serverLogger.warn('optional time row skipped', {
						gameName,
						excelRow,
						value,
						error: err instanceof Error ? err.message : String(err),
					});
				}
				continue;
			}

			if (isGameTypeLabel(firstLowerText) && !isReadingStats) {
				const value = labelledValue(first, second, /^game\s*type\s*:?\s*/i);
				// A Game Type row with no value says nothing, so leave the sheet name in charge.
				if (value === undefined || value === null || String(value).trim() === '') {
					continue;
				}
				gameType = parseGameType(value, gameName, excelRow);
				sawExplicitGameType = true;
				continue;
			}

			if (firstLowerText.startsWith('category') && !isReadingStats) {
				isReadingStats = true;
				continue;
			}

			if (!isReadingStats) {
				// Some sheets drop the type on a row of its own, with no "Game Type" label beside it.
				if (second === undefined || second === null || String(second).trim() === '') {
					const loose = parseGameTypeLabel(first);
					if (loose && loose !== 'regular') looseGameType = loose;
				}
				continue;
			}

			if (isPlayerHeaderRow(first)) {
				// Result-only sheets (Win/Lose/Default Lose) may still include a header row — ignore it.
				if (resultOnlyGame) {
					currentHeaders = [];
					continue;
				}

				const blankHeader = (cell: RowValue) =>
					cell == null || (typeof cell === 'string' && cell.trim() === '');
				if (!row.every((cell) => blankHeader(cell) || typeof cell === 'string')) {
					throw gameError(
						gameName,
						`Header row (Excel row ${excelRow})`,
						`Invalid headers: ${JSON.stringify(row)}`
					);
				}

				// Blank header cells are empty columns. Keep their index so player values stay aligned.
				const headers: Header[] = [];
				for (let i = 0; i < row.length; i++) {
					const cell = row[i];
					if (typeof cell !== 'string' || cell.trim() === '') {
						headers.push('' as Header);
						continue;
					}
					const lowered = cell.trim().toLowerCase();
					headers.push(HEADER_REPLACEMENTS[lowered] ?? (lowered as Header));
				}
				currentHeaders = headers;
				currentPointsOnly = isPointsOnlyHeaders(currentHeaders);
				continue;
			}

			// A jersey kept as text ("00", "04") is still a player on the open team.
			// Treating it as a team name splits the roster and drops the real opponent.
			if (
				typeof first === 'string' &&
				isJerseyNumberLabel(first) &&
				currentTeam &&
				currentHeaders.length > 0 &&
				!resultOnlyGame
			) {
				currentTeam.playerStats.push(
					parseStatsRow(row, currentHeaders, gameName, currentTeam.name, currentPointsOnly)
				);
				continue;
			}

			if (typeof first === 'string') {
				if (!isTeamNameRow(rows, rowIndex)) {
					serverLogger.warn('skipped a column A row that is not a team name', {
						gameName,
						excelRow,
						value: first,
					});
					continue;
				}

				const parsedScore = parseTeamScoreCell(second, gameName, first.toString(), excelRow);

				if (parsedScore.kind === 'result') {
					resultOnlyGame = true;
					teamResults.push(parsedScore.result);
				} else {
					teamResults.push(null);
				}

				currentTeam = {
					name: first.toString(),
					score: parsedScore.score,
					playerStats: [],
					_status: 'new',
				};

				teams.push(currentTeam);

				continue;
			}

			// Win/Lose/Default Lose sheets have no usable player box score — skip leftover rows.
			if (resultOnlyGame) {
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

			const playerStats = parseStatsRow(
				row,
				currentHeaders,
				gameName,
				currentTeam.name,
				currentPointsOnly
			);
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

		let defaultLossSide: 'home' | 'away' | null = null;
		if (resultOnlyGame) {
			const wins = teamResults.filter((r) => r === 'win').length;
			const losses = teamResults.filter((r) => r === 'lose' || r === 'default_lose').length;
			if (wins !== 1 || losses !== 1) {
				throw gameError(
					gameName,
					'Teams',
					'Result-only sheets need exactly one Win and one Lose (or Default Lose) beside the team names'
				);
			}

			for (const team of teams) {
				team.playerStats = [];
			}
			if (teamResults[0] === 'default_lose') defaultLossSide = 'home';
			if (teamResults[1] === 'default_lose') defaultLossSide = 'away';
		}

		if (sawExplicitGameType) {
			gameType = refineGameTypeWithName(gameType, gameName);
		} else if (looseGameType) {
			gameType = looseGameType;
		} else {
			const fromName = parseGameTypeLabel(gameName);
			if (fromName && fromName !== 'regular') gameType = fromName;
		}

		const [homeTeam, awayTeam] = teams;
		if (!resultOnlyGame) {
			for (const team of teams) {
				if (team.score !== 0) continue;
				const fromPlayers = team.playerStats.reduce((sum, row) => {
					if (row.recordedPts != null) return sum + row.recordedPts;
					const madeTwos = row.stats.fgm - row.stats.fg3m;
					return sum + madeTwos * 2 + row.stats.fg3m * 3 + row.stats.ftm;
				}, 0);
				if (fromPlayers > 0) team.score = fromPlayers;
			}
		}

		const playerRows = teams.flatMap((team) => team.playerStats);
		const pointsOnly =
			!resultOnlyGame &&
			playerRows.length > 0 &&
			playerRows.every((row) => row.recordedPts != null);

		return {
			name: gameName,
			completedAt: new Date(gameTime.epochMilliseconds),
			playedOn,
			gameType,
			gameTypeExplicit: sawExplicitGameType,
			defaultLossSide,
			statsAvailable: !resultOnlyGame,
			pointsOnly,
			homeTeam,
			awayTeam,
		};
	} catch (err) {
		const detail = err instanceof Error ? err.message : 'Unknown parse error';
		const base =
			err instanceof SpreadsheetParserError && err.message.startsWith(`Game: ${gameName}`)
				? err
				: gameError(gameName, 'Sheet', detail, err);
		const message = withPlayedOn(base.message, gameName, playedOn);
		if (message === base.message) throw base;
		throw new SpreadsheetParserError(message, { cause: err, issues: [message] });
	}
}

const parse: SpreadsheetParser['parse'] = (workbook, options) => {
	const sheetNames = workbook.SheetNames.filter((s) => s.toLowerCase() !== 'acronyms');

	const games: GamePreview[] = [];
	const failures: string[] = [];
	for (const name of sheetNames) {
		try {
			games.push(parseGameSheet(workbook.Sheets[name], name, options));
		} catch (err) {
			const message =
				err instanceof SpreadsheetParserError
					? err.message
					: `Game: ${name} — Sheet — ${err instanceof Error ? err.message : 'Unknown parse error'}`;
			failures.push(message);
		}
	}

	if (failures.length > 0) {
		throw new SpreadsheetParserError(failures.join('\n'), { issues: failures });
	}

	return { games, version: 'v1' };
};

export const spreadsheetParserV1: SpreadsheetParser = { version: 'v1', parse };
