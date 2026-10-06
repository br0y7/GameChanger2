import { describe, expect, test } from 'bun:test';
import {
	completedGameLabel,
	defaultResultLabel,
	formatGameLogDate,
	isDefaultGame,
	resolveImportedGameType,
	resultOnlyOutcome,
} from './game';

describe('formatGameLogDate', () => {
	test('prints the calendar day or TBD', () => {
		expect(formatGameLogDate(new Date(2026, 9, 4))).toBe('Oct 4, 2026');
		expect(formatGameLogDate(null)).toBe('TBD');
		expect(formatGameLogDate('not a date')).toBe('TBD');
	});
});

describe('defaultResultLabel', () => {
	test('names a default loss for that team and a default win for the other', () => {
		expect(defaultResultLabel('home', true)).toBe('Default lose');
		expect(defaultResultLabel('home', false)).toBe('Default win');
		expect(defaultResultLabel('away', false)).toBe('Default lose');
		expect(defaultResultLabel('away', true)).toBe('Default win');
		expect(defaultResultLabel(null, true)).toBeNull();
	});

	test('falls back to the score when the sheet did not mark a default loss', () => {
		expect(resultOnlyOutcome(null, false, 1, 0)).toBe('Win');
		expect(resultOnlyOutcome(null, true, 0, 1)).toBe('Lose');
		expect(resultOnlyOutcome('away', false, 0, 1)).toBe('Default lose');
		expect(resultOnlyOutcome('away', true, 1, 0)).toBe('Default win');
	});
});

describe('resolveImportedGameType', () => {
	test('a sheet with no Game Type row cannot reset a stored playoff game', () => {
		expect(resolveImportedGameType('playoff', 'regular', false)).toBe('playoff');
		expect(resolveImportedGameType('finals', 'regular', false)).toBe('finals');
	});

	test('a stated Game Type corrects a wrongly typed postseason game', () => {
		expect(resolveImportedGameType('finals', 'regular', true)).toBe('regular');
		expect(resolveImportedGameType('playoff', 'semifinal', true)).toBe('semifinal');
	});

	test('a regular-season game takes whatever the sheet says', () => {
		expect(resolveImportedGameType('regular', 'playoff', false)).toBe('playoff');
		expect(resolveImportedGameType(null, 'regular', false)).toBe('regular');
	});
});

describe('isDefaultGame', () => {
	test('keeps a points-only game and a full box score off the default label', () => {
		expect(
			isDefaultGame({ statsAvailable: false, defaultLossSide: 'home', pointsOnly: true })
		).toBe(false);
		expect(
			isDefaultGame({ statsAvailable: true, defaultLossSide: 'away', pointsOnly: false })
		).toBe(false);
		expect(isDefaultGame({ statsAvailable: false, defaultLossSide: null, pointsOnly: false })).toBe(
			false
		);
		expect(
			isDefaultGame({ statsAvailable: false, defaultLossSide: 'away', pointsOnly: false })
		).toBe(true);
	});

	test('shows the point total for a points-only game even if a default side was stored', () => {
		expect(
			completedGameLabel({
				statsAvailable: false,
				defaultLossSide: 'home',
				pointsOnly: true,
				isHome: true,
				result: 'W',
				teamScore: 22,
				oppScore: 15,
			})
		).toBe('W 22–15');
		expect(
			completedGameLabel({
				statsAvailable: false,
				defaultLossSide: 'away',
				pointsOnly: false,
				isHome: false,
				result: 'L',
				teamScore: 0,
				oppScore: 1,
			})
		).toBe('Default lose');
		expect(
			completedGameLabel({
				statsAvailable: false,
				defaultLossSide: null,
				pointsOnly: false,
				isHome: true,
				result: 'W',
				teamScore: 1,
				oppScore: 0,
			})
		).toBe('W');
	});
});
