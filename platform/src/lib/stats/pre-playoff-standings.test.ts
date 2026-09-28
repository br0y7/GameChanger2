import { describe, expect, test } from 'bun:test';
import { formatPrePlayoffStandings } from './pre-playoff-standings';

describe('formatPrePlayoffStandings', () => {
	test('lists every division in rank order with ties sharing a rank', () => {
		const text = formatPrePlayoffStandings([
			{
				name: 'Dark Blue',
				rows: [
					{ rank: 1, name: 'Red', wins: 5, losses: 1, ties: 0 },
					{ rank: 2, name: 'Blue', wins: 4, losses: 2, ties: 0 },
					{ rank: 2, name: 'White', wins: 4, losses: 2, ties: 1 },
				],
			},
			{
				name: 'Gold',
				rows: [{ rank: 1, name: 'Black', wins: 3, losses: 0, ties: 0 }],
			},
		]);

		expect(text).toContain('Rankings before playoffs');
		expect(text).toContain('Dark Blue:');
		expect(text).toContain('- #1 Red 5-1');
		expect(text).toContain('- #2 Blue 4-2');
		expect(text).toContain('- #2 White 4-2-1');
		expect(text).toContain('Gold:');
		expect(text).toContain('- #1 Black 3-0');
	});
});
