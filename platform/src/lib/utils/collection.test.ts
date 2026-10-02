import { describe, expect, test } from 'bun:test';
import { shootingPct, shootingPercentageBy } from './collection';

describe('shootingPct', () => {
	test('is makes divided by attempts', () => {
		expect(shootingPct(5, 10)).toBe(0.5);
	});

	test('treats missing attempts as at least the makes', () => {
		expect(shootingPct(11, 0)).toBe(1);
	});

	test('never exceeds 100%', () => {
		expect(shootingPct(22, 1)).toBe(1);
	});
});

describe('shootingPercentageBy', () => {
	test('does not let 0-FGA games inflate the season percentage', () => {
		const pct = shootingPercentageBy(
			[
				{ fgm: 11, fga: 0 },
				{ fgm: 11, fga: 0 },
				{ fgm: 0, fga: 1 },
			],
			(row) => row.fgm,
			(row) => row.fga
		);
		expect(pct).toBe(22 / 23);
		expect(pct).toBeLessThanOrEqual(1);
	});

	test('keeps real misses when some games recorded attempts', () => {
		const pct = shootingPercentageBy(
			[
				{ fgm: 10, fga: 0 },
				{ fgm: 2, fga: 8 },
			],
			(row) => row.fgm,
			(row) => row.fga
		);
		expect(pct).toBe(12 / 18);
	});
});
