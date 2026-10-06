import { describe, expect, test } from 'bun:test';
import { formatAiGameLine } from './game-line';

describe('formatAiGameLine', () => {
	test('includes oreb, dreb, and shooting percentages', () => {
		const line = formatAiGameLine({
			label: 'vs White',
			pts: 18,
			reb: 9,
			oreb: 3,
			dreb: 6,
			ast: 2,
			stl: 1,
			blk: 0,
			tov: 3,
			pf: 2,
			fgm: 7,
			fga: 16,
			fg3m: 2,
			fg3a: 6,
			ftm: 2,
			fta: 4,
			fgPct: 7 / 16,
			gameRating: 8.1,
		});

		expect(line).toContain('3 OREB');
		expect(line).toContain('6 DREB');
		expect(line).toContain('FG 7-16');
		expect(line).toContain('3P 2-6');
		expect(line).toContain('FT 2-4');
		expect(line).toContain('rating 8.1');
	});

	test('marks a points-only line instead of inventing zeros', () => {
		expect(
			formatAiGameLine({
				label: 'vs Red',
				pointsOnly: true,
				pts: 12,
				reb: 0,
				oreb: 0,
				ast: 0,
				stl: 0,
				blk: 0,
				tov: 0,
			})
		).toContain('points-only');
	});
});
