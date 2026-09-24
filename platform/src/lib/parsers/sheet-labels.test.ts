import { describe, expect, test } from 'bun:test';
import { isPointsOnlyHeaders, parseGameTypeLabel } from './sheet-labels';

describe('parseGameTypeLabel', () => {
	test('reads third place labels', () => {
		expect(parseGameTypeLabel('Third Place')).toBe('third_place');
		expect(parseGameTypeLabel('3rd place')).toBe('third_place');
		expect(parseGameTypeLabel('third-place')).toBe('third_place');
	});

	test('keeps the existing game types', () => {
		expect(parseGameTypeLabel('Playoff')).toBe('playoff');
		expect(parseGameTypeLabel('Finals')).toBe('finals');
		expect(parseGameTypeLabel('Regular Season')).toBe('regular');
		expect(parseGameTypeLabel('')).toBe('regular');
		expect(parseGameTypeLabel('exhibition')).toBeNull();
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
