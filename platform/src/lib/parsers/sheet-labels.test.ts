import { describe, expect, test } from 'bun:test';
import {
	isPointsOnlyHeaders,
	normalizeStatHeader,
	parseGameTypeLabel,
	parseShotPair,
	refineGameTypeWithName,
} from './sheet-labels';

describe('parseGameTypeLabel', () => {
	test('reads third place labels', () => {
		expect(parseGameTypeLabel('Third Place')).toBe('third_place');
		expect(parseGameTypeLabel('3rd place')).toBe('third_place');
		expect(parseGameTypeLabel('third-place')).toBe('third_place');
	});

	test('reads playoffs semis labels, including sheet names', () => {
		expect(parseGameTypeLabel('Playoffs Semis')).toBe('semifinal');
		expect(parseGameTypeLabel('Playoff Semis')).toBe('semifinal');
		expect(parseGameTypeLabel('Playoff Semi')).toBe('semifinal');
		expect(parseGameTypeLabel('Semis')).toBe('semifinal');
		expect(parseGameTypeLabel('semi-finals')).toBe('semifinal');
		expect(parseGameTypeLabel('Winners Bracket Semis 1')).toBe('semifinal');
		expect(parseGameTypeLabel('Loser Semis 1')).toBe('semifinal');
		expect(parseGameTypeLabel('Losers Bracket Semis 2')).toBe('semifinal');
	});

	test('keeps the existing game types', () => {
		expect(parseGameTypeLabel('Playoff')).toBe('playoff');
		expect(parseGameTypeLabel('Playoffs - Round 1 Game 1')).toBe('playoff');
		expect(parseGameTypeLabel('Finals')).toBe('finals');
		expect(parseGameTypeLabel('Winners Bracket Finals')).toBe('finals');
		expect(parseGameTypeLabel('Championship Game')).toBe('finals');
		expect(parseGameTypeLabel('Third Place Game')).toBe('third_place');
		expect(parseGameTypeLabel('Regular Season')).toBe('regular');
		expect(parseGameTypeLabel('')).toBe('regular');
		expect(parseGameTypeLabel('White vs Beige')).toBeNull();
		expect(parseGameTypeLabel('exhibition')).toBeNull();
	});
});

describe('refineGameTypeWithName', () => {
	test('sharpens a plain playoff label using the sheet name', () => {
		expect(refineGameTypeWithName('playoff', 'Blue vs Red Semis')).toBe('semifinal');
		expect(refineGameTypeWithName('playoff', 'Red vs White Third Place Game')).toBe('third_place');
		expect(refineGameTypeWithName('playoff', 'Yellow vs Blue Finals')).toBe('finals');
	});

	test('leaves the label alone when the name adds nothing', () => {
		expect(refineGameTypeWithName('playoff', 'KO Black vs Red')).toBe('playoff');
		expect(refineGameTypeWithName('regular', 'Semis White vs Yellow')).toBe('regular');
		expect(refineGameTypeWithName('finals', 'Yellow vs Blue Semis')).toBe('finals');
	});
});

describe('normalizeStatHeader', () => {
	test('maps FG and 3PT aliases onto make columns', () => {
		expect(normalizeStatHeader('FG')).toBe('fgm');
		expect(normalizeStatHeader('3PT')).toBe('fg3m');
		expect(normalizeStatHeader('3PTM')).toBe('fg3m');
		expect(normalizeStatHeader('3PA')).toBe('fg3a');
		expect(normalizeStatHeader('FT')).toBe('ftm');
		expect(normalizeStatHeader('Player No.')).toBe('jerseyNumber');
		expect(normalizeStatHeader('PTS')).toBe('pts');
	});
});

describe('parseShotPair', () => {
	test('reads 9-25, slashes, and Excel dates as makes and attempts', () => {
		expect(parseShotPair('9-25')).toEqual({ makes: 9, attempts: 25 });
		expect(parseShotPair('9 / 25')).toEqual({ makes: 9, attempts: 25 });
		expect(parseShotPair('9/25/2026')).toEqual({ makes: 9, attempts: 25 });
		expect(parseShotPair('25-Sep')).toEqual({ makes: 9, attempts: 25 });
		expect(parseShotPair(new Date(Date.UTC(2026, 8, 25)))).toEqual({ makes: 9, attempts: 25 });
		expect(parseShotPair(46290)).toEqual({ makes: 9, attempts: 25 });
	});

	test('leaves ordinary shooting numbers alone', () => {
		expect(parseShotPair(9)).toBeNull();
		expect(parseShotPair(25)).toBeNull();
		expect(parseShotPair('10-3')).toBeNull();
	});
});

describe('isPointsOnlyHeaders', () => {
	test('is true when the only stat column is points', () => {
		expect(isPointsOnlyHeaders(['jerseyNumber', 'pts'])).toBe(true);
		expect(isPointsOnlyHeaders(['jerseyNumber', 'points'])).toBe(true);
	});

	test('is false for a full box score, even if points is included', () => {
		expect(isPointsOnlyHeaders(['jerseyNumber', 'pts', 'fgm', 'fga', 'ast'])).toBe(false);
		expect(isPointsOnlyHeaders(['jerseyNumber', 'fgm', 'fga'])).toBe(false);
	});
});
