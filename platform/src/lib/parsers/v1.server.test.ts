import { describe, expect, test } from 'bun:test';
import * as xlsx from 'xlsx';
import { spreadsheetParserV1 } from './v1.server';

const TIME_ZONE = 'America/Winnipeg';

type Row = (string | number | Date | null | undefined)[];

function parseSheet(sheetName: string, rows: Row[]) {
	const workbook = xlsx.utils.book_new();
	xlsx.utils.book_append_sheet(workbook, xlsx.utils.aoa_to_sheet(rows), sheetName);

	return spreadsheetParserV1.parse(workbook, { timeZone: TIME_ZONE }).games[0];
}

/** The rows every sheet needs, so each test only shows the rows it cares about. */
function sheetWith(headerRows: Row[]): Row[] {
	return [
		...headerRows,
		['Category', '15-17 years old'],
		['Black'],
		['Player No.', 'PTS', 'FGM', 'FGA'],
		[1, 5, 2, 4],
		['White'],
		['Player No.', 'PTS', 'FGM', 'FGA'],
		[2, 7, 3, 5],
	];
}

describe('game type', () => {
	test('reads the label from the cell beside it', () => {
		const game = parseSheet('White vs Black', sheetWith([['Game Type', 'Playoffs Semis']]));
		expect(game.gameType).toBe('semifinal');
	});

	test('reads the label written in one cell', () => {
		const game = parseSheet('White vs Black', sheetWith([['Game Type: Playoffs Semis']]));
		expect(game.gameType).toBe('semifinal');
	});

	test('reads the label under other wordings', () => {
		expect(
			parseSheet('White vs Black', sheetWith([['Type of Game:', 'Playoffs Semis']])).gameType
		).toBe('semifinal');
		expect(parseSheet('White vs Black', sheetWith([['Type', 'Playoffs Semis']])).gameType).toBe(
			'semifinal'
		);
	});

	test('reads a type written on a row of its own', () => {
		const game = parseSheet('White vs Black', sheetWith([['Playoffs Semis']]));
		expect(game.gameType).toBe('semifinal');
	});

	test('falls back to the sheet name when the Game Type row is blank', () => {
		const game = parseSheet('Semis White vs Yellow', sheetWith([['Game Type', '']]));
		expect(game.gameType).toBe('semifinal');
	});

	test('falls back to the sheet name when there is no Game Type row', () => {
		expect(parseSheet('Semis White vs Yellow', sheetWith([])).gameType).toBe('semifinal');
		expect(parseSheet('Yellow vs Blue Finals', sheetWith([])).gameType).toBe('finals');
		expect(parseSheet('KO Black vs Red', sheetWith([])).gameType).toBe('regular');
	});

	test('sharpens a plain Playoff label with the sheet name', () => {
		const game = parseSheet('Blue vs Red Semis', sheetWith([['Game Type', 'Playoff']]));
		expect(game.gameType).toBe('semifinal');
	});

	test('keeps a Regular Season label the sheet states outright', () => {
		const game = parseSheet('Semis White vs Yellow', sheetWith([['Game Type', 'Regular Season']]));
		expect(game.gameType).toBe('regular');
	});
});

describe('date and time rows', () => {
	function completedAt(rows: Row[]) {
		return parseSheet('White vs Black', sheetWith(rows)).completedAt.toISOString();
	}

	test('reads excel date and time values', () => {
		// 2026-08-23, 10:00 in Winnipeg (CDT, UTC-5)
		expect(
			completedAt([
				['Date of Game:', 46257],
				['Time of Game', 10 / 24],
			])
		).toBe('2026-08-23T15:00:00.000Z');
	});

	test('reads a date typed as text', () => {
		expect(
			completedAt([
				['Date of Game:', '2026-08-23'],
				['Time of Game', 10 / 24],
			])
		).toBe('2026-08-23T15:00:00.000Z');
		expect(
			completedAt([
				['Date of Game:', 'August 23, 2026'],
				['Time of Game', 10 / 24],
			])
		).toBe('2026-08-23T15:00:00.000Z');
	});

	test('reads a time typed as text', () => {
		expect(
			completedAt([
				['Date of Game:', '2026-08-23'],
				['Time of Game', '10:00 AM'],
			])
		).toBe('2026-08-23T15:00:00.000Z');
	});

	test('reads a date and time written in one cell', () => {
		expect(completedAt([['Date: 2026-08-23 10:00 AM']])).toBe('2026-08-23T15:00:00.000Z');
	});

	test('reports a date it cannot read', () => {
		expect(() => completedAt([['Date of Game:', 'next tuesday']])).toThrow(/Invalid date/);
	});
});

describe('points only', () => {
	test('uses player points as the score when the team cell is blank', () => {
		const game = parseSheet('Brown vs Black', [
			['Category', '15-17 years old'],
			['Brown'],
			['Player No.', 'PTS', 'FGM', 'FGA'],
			[1, 12, '', ''],
			[2, 8, '', ''],
			['Black'],
			['Player No.', 'PTS'],
			[3, 18],
			[4, 12],
		]);

		expect(game.pointsOnly).toBe(true);
		expect(game.homeTeam.score).toBe(20);
		expect(game.awayTeam.score).toBe(30);
		expect(game.homeTeam.playerStats[0]?.recordedPts).toBe(12);
		expect(game.awayTeam.playerStats.every((row) => row.recordedPts != null)).toBe(true);
	});

	test('ignores a blank column in the header row', () => {
		const game = parseSheet('Brown vs White', [
			['Category', '15-17 years old'],
			['Brown', 20],
			['Player No.', null, 'PTS'],
			[1, null, 12],
			[2, null, 8],
			['White', 15],
			['Player No.', , 'PTS'],
			[4, , 15],
		]);

		expect(game.pointsOnly).toBe(true);
		expect(game.homeTeam.playerStats.map((row) => row.recordedPts)).toEqual([12, 8]);
		expect(game.awayTeam.playerStats[0]?.recordedPts).toBe(15);
		expect(game.homeTeam.score).toBe(20);
		expect(game.awayTeam.score).toBe(15);
	});

	test('keeps a jersey stored as text on the current team', () => {
		const game = parseSheet('Teal Green vs Dark Blue', [
			['Category', 'girls'],
			['Teal Green', 38],
			['Player No.', 'PTS'],
			[15, 10],
			['00', 4],
			[5, 2],
			['Dark Blue', 20],
			['Player No.', 'PTS'],
			[1, 8],
			['04', 3],
			[7, 5],
		]);

		expect(game.homeTeam.name).toBe('Teal Green');
		expect(game.awayTeam.name).toBe('Dark Blue');
		expect(game.homeTeam.playerStats.map((row) => row.jerseyNumber)).toEqual(['15', '00', '5']);
		expect(game.awayTeam.playerStats.map((row) => row.jerseyNumber)).toEqual(['1', '04', '7']);
		expect(game.homeTeam.score).toBe(38);
		expect(game.awayTeam.score).toBe(20);
		expect(game.homeTeam.playerStats.find((row) => row.jerseyNumber === '00')?.recordedPts).toBe(4);
	});

	test('does not treat Dads jersey 5 as a third team named 5', () => {
		const game = parseSheet('Team 1 vs Team 5', [
			['Category', 'Dads'],
			['Team 1', 40],
			['Player No.', 'PTS'],
			[4, 12],
			['5', 8],
			[6, 6],
			['Team 5', 35],
			['Player No.', 'PTS'],
			[1, 15],
			[2, 10],
		]);

		expect(game.homeTeam.name).toBe('Team 1');
		expect(game.awayTeam.name).toBe('Team 5');
		expect(game.homeTeam.playerStats.map((row) => row.jerseyNumber)).toEqual(['4', '5', '6']);
		expect(game.awayTeam.playerStats.map((row) => row.jerseyNumber)).toEqual(['1', '2']);
	});

	test('does not create a team named 00 or 04', () => {
		const game = parseSheet('Teal Green vs Dark Blue', [
			['Category', 'girls'],
			['00', 4],
			['Teal Green', 38],
			['Player No.', 'PTS'],
			[15, 10],
			['04', 3],
			['Dark Blue', 20],
			['Player No.', 'PTS'],
			[1, 8],
		]);

		expect(game.homeTeam.name).toBe('Teal Green');
		expect(game.awayTeam.name).toBe('Dark Blue');
	});

	test('keeps a score written beside the team name', () => {
		const game = parseSheet('Brown vs Black', [
			['Category', '15-17 years old'],
			['Brown', 22],
			['Player No.', 'PTS'],
			[1, 10],
			[2, 8],
			['Black', 15],
			['Player No.', 'PTS'],
			[3, 15],
		]);

		expect(game.pointsOnly).toBe(true);
		expect(game.homeTeam.score).toBe(22);
		expect(game.awayTeam.score).toBe(15);
	});

	test('keeps the sheet PTS and box columns on a full stat line', () => {
		const game = parseSheet('White vs Yellow', [
			['Category', '15-17 years old'],
			['White', 59],
			['Player No.', 'PTS', 'FGM', 'FGA', 'AST'],
			[1, 12, 5, 10, 3],
			[2, 8, 3, 8, 1],
			['Yellow', 57],
			['Player No.', 'PTS', 'FGM', 'FGA', 'AST'],
			[3, 15, 6, 12, 2],
			[4, 10, 4, 9, 4],
		]);

		expect(game.pointsOnly).toBe(false);
		expect(game.homeTeam.score).toBe(59);
		expect(game.awayTeam.score).toBe(57);
		expect(game.homeTeam.playerStats[0]).toMatchObject({
			jerseyNumber: '1',
			recordedPts: 12,
			stats: { fgm: 5, fga: 10, ast: 3 },
		});
		expect(game.awayTeam.playerStats[0]).toMatchObject({
			jerseyNumber: '3',
			recordedPts: 15,
			stats: { fgm: 6, fga: 12, ast: 2 },
		});
	});
});

describe('notes typed into column A', () => {
	test('a note above the teams does not take a team slot', () => {
		const game = parseSheet('White vs Yellow', [
			['Category', '15-17 years old'],
			["missing some footage so stats aren't 100% accurate"],
			['White'],
			['Player No.', 'PTS'],
			[1, 10],
			['Yellow'],
			['Player No.', 'PTS'],
			[2, 8],
		]);

		expect(game.homeTeam.name).toBe('White');
		expect(game.awayTeam.name).toBe('Yellow');
	});

	test('notes below the box score are ignored', () => {
		const game = parseSheet('Blue vs Red', [
			['Category', '15-17 years old'],
			['Blue'],
			['Player No.', 'PTS'],
			[1, 10],
			['Red'],
			['Player No.', 'PTS'],
			[2, 8],
			['No Footage'],
			['Team Weakness'],
			[null, 'Weak rebounding'],
		]);

		expect(game.homeTeam.name).toBe('Blue');
		expect(game.awayTeam.name).toBe('Red');
		expect(game.homeTeam.score).toBe(10);
		expect(game.awayTeam.score).toBe(8);
	});

	test('a team named for its score alone is still a team', () => {
		const game = parseSheet('Brown vs Black', [
			['Category', '15-17 years old'],
			['Brown', 22],
			['Player No.', 'PTS'],
			[1, 10],
			[2, 8],
			['Black', 15],
			['Player No.', 'PTS'],
			[3, 15],
		]);

		expect(game.pointsOnly).toBe(true);
		expect(game.homeTeam.score).toBe(22);
		expect(game.awayTeam.score).toBe(15);
	});
});

describe('shooting pairs', () => {
	test('reads makes-attempts pairs and Excel dates as FGM/FGA', () => {
		const sept25 = new Date(Date.UTC(2026, 8, 25));
		const game = parseSheet('Red vs White Finals U12', [
			['Category', 'U12'],
			['Red', 40],
			['Player No.', 'PTS', 'FG', '3PT', 'FT'],
			[1, 22, '9-25', '2-8', '2-4'],
			[2, 10, sept25, '1-3', '0-0'],
			['White', 38],
			['Player No.', 'PTS', 'FGM', 'FGA', '3PTM', '3PA', 'FTM', 'FTA'],
			[3, 15, 6, 12, 1, 4, 2, 2],
			[4, 8, 3, 9, 0, 2, 2, 4],
		]);

		expect(game.homeTeam.playerStats[0]?.stats).toMatchObject({
			fgm: 9,
			fga: 25,
			fg3m: 2,
			fg3a: 8,
			ftm: 2,
			fta: 4,
		});
		expect(game.homeTeam.playerStats[1]?.stats).toMatchObject({ fgm: 9, fga: 25 });
		expect(game.awayTeam.playerStats[0]?.stats).toMatchObject({
			fgm: 6,
			fga: 12,
			fg3m: 1,
			fg3a: 4,
			ftm: 2,
			fta: 2,
		});
		expect(game.awayTeam.playerStats[1]?.stats).toMatchObject({ fgm: 3, fga: 9 });
	});

	test('does not let a blank FGA cell wipe a pair written under FGM', () => {
		const game = parseSheet('Red vs White Finals U12', [
			['Category', 'U12'],
			['Red', 22],
			['Player No.', 'PTS', 'FGM', 'FGA'],
			[1, 22, '9/25', ''],
			['White', 15],
			['Player No.', 'PTS', 'FGM', 'FGA'],
			[3, 15, 6, 12],
		]);

		expect(game.homeTeam.playerStats[0]?.stats).toMatchObject({ fgm: 9, fga: 25 });
		expect(game.awayTeam.playerStats[0]?.stats).toMatchObject({ fgm: 6, fga: 12 });
	});
});
