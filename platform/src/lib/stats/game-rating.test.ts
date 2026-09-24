import { describe, expect, test } from 'bun:test';
import {
	averageGameRating,
	baseRatingFromPercentile,
	buildRatingScale,
	computeGameRating,
	impactParts,
	isEmptyLine,
	percentileRank,
	ratingMeaning,
	roundRating,
	scoringContextBonus,
	trendVersusAverage,
	type CountingLine,
} from './game-rating';

function line(overrides: Partial<CountingLine> = {}): CountingLine {
	return {
		fgm: 0,
		fga: 0,
		fg3m: 0,
		fg3a: 0,
		ftm: 0,
		fta: 0,
		oreb: 0,
		dreb: 0,
		ast: 0,
		stl: 0,
		blk: 0,
		tov: 0,
		pf: 0,
		...overrides,
	};
}

describe('impact', () => {
	test('weights possessions, misses, and turnovers', () => {
		const parts = impactParts(
			line({
				fgm: 12,
				fga: 20,
				fg3m: 2,
				ftm: 4,
				fta: 6,
				oreb: 11,
				dreb: 15,
				ast: 1,
				stl: 1,
				blk: 1,
				tov: 8,
				pf: 2,
			})
		);

		expect(parts.points).toBe(30);
		expect(parts.rebounds).toBe(26);
		// 30 + 11*1.25 + 15*0.8 + 1*1.35 + 1*2 + 1*1.75 - 8*1.6 - 2*0.3 - 8*0.55 - 2*0.25
		expect(parts.impact).toBeCloseTo(30 + 13.75 + 12 + 1.35 + 2 + 1.75 - 12.8 - 0.6 - 4.4 - 0.5, 5);
	});

	test('an empty line is not a performance', () => {
		expect(isEmptyLine(line())).toBe(true);
		expect(isEmptyLine(line({ min: 12 } as Partial<CountingLine>))).toBe(true);
		expect(isEmptyLine(line({ fga: 1 }))).toBe(false);
		expect(isEmptyLine(line({ pf: 1 }))).toBe(false);
	});
});

describe('context bonus', () => {
	test('30 of 34 team points rounds to the +0.4 cap', () => {
		expect(scoringContextBonus(30, 34)).toBeCloseTo((30 / 34 - 0.4) * 0.8, 5);
		expect(Math.round(scoringContextBonus(30, 34) * 10) / 10).toBe(0.4);
	});

	test('does not boost a small share of a high team total', () => {
		expect(scoringContextBonus(30, 100)).toBe(0);
		expect(scoringContextBonus(10, 0)).toBe(0);
		expect(scoringContextBonus(10, null)).toBe(0);
	});

	test('caps the bonus at 0.4', () => {
		expect(scoringContextBonus(40, 40)).toBe(0.4);
	});
});

describe('percentile bands', () => {
	test('maps the published cut points', () => {
		expect(baseRatingFromPercentile(0)).toBeCloseTo(3.5, 5);
		expect(baseRatingFromPercentile(10)).toBeCloseTo(5.2, 5);
		expect(baseRatingFromPercentile(50)).toBeCloseTo(6.8, 5);
		expect(baseRatingFromPercentile(94)).toBeCloseTo(8.5 + ((94 - 90) / 7) * 0.7, 5);
		expect(baseRatingFromPercentile(99.5)).toBeCloseTo(9.7, 5);
		expect(baseRatingFromPercentile(100)).toBeCloseTo(10, 5);
	});

	test('tied impacts share a percentile', () => {
		const scale = [1, 2, 2, 2, 5];
		expect(percentileRank(scale, 2)).toBe(percentileRank(scale, 2));
		expect(percentileRank(scale, 2)).toBeCloseTo(((1 + 0.5 * 3) / 5) * 100, 5);
		expect(percentileRank(scale, 5)).toBeGreaterThan(percentileRank(scale, 2));
	});
});

describe('computeGameRating', () => {
	test('rates a dominant low-scoring game from the division scale', () => {
		const samples = Array.from({ length: 100 }, (_, index) =>
			impactParts(line({ fgm: index % 8, fga: 10, ftm: index % 3, dreb: index % 5, ast: index % 4 }))
		);
		const standout = line({
			fgm: 14,
			fga: 18,
			fg3m: 2,
			ftm: 4,
			fta: 4,
			oreb: 11,
			dreb: 15,
			stl: 1,
			blk: 1,
			tov: 8,
			pf: 2,
		});
		samples.push(impactParts(standout));
		const scale = buildRatingScale(samples);
		const rated = computeGameRating({ line: standout, teamPoints: 34, scale });

		expect(rated).not.toBeNull();
		expect(rated!.ratingVersion).toBe('GC-v1');
		expect(rated!.rating).toBeGreaterThanOrEqual(8);
		expect(rated!.rating).toBeLessThanOrEqual(10);
		expect(rated!.contextBonus).toBe(0.4);
		expect(rated!.breakdown.gameContext).toBe('Exceptional');
		expect(rated!.meaning).toBe(ratingMeaning(rated!.rating));
		expect(roundRating(rated!.rating)).toBe(rated!.rating);
	});

	test('returns null without a scale or without a stat line', () => {
		const scale = buildRatingScale([]);
		expect(computeGameRating({ line: line({ fgm: 4, fga: 8 }), teamPoints: 40, scale })).toBeNull();
		const populated = buildRatingScale([impactParts(line({ fgm: 4, fga: 8 }))]);
		expect(computeGameRating({ line: line(), teamPoints: 40, scale: populated })).toBeNull();
	});

	test('high turnovers are poor ball security against a clean scale', () => {
		const samples = Array.from({ length: 20 }, () => impactParts(line({ fgm: 4, fga: 8, tov: 1 })));
		samples.push(impactParts(line({ fgm: 4, fga: 8, tov: 8 })));
		const scale = buildRatingScale(samples);
		const rated = computeGameRating({
			line: line({ fgm: 4, fga: 8, tov: 8 }),
			teamPoints: 50,
			scale,
		});
		expect(rated!.breakdown.ballSecurity).toBe('Poor');
	});
});

describe('season figures', () => {
	test('averages stored ratings and flags a real swing', () => {
		expect(averageGameRating([7.1, 7.4, 8.2])).toBe(7.6);
		expect(averageGameRating([])).toBeNull();
		expect(trendVersusAverage(9.1, 7.9)).toBe('up');
		expect(trendVersusAverage(7.1, 7.0)).toBe('flat');
		expect(trendVersusAverage(5.9, 6.6)).toBe('down');
	});

	test('meaning bands use one-decimal cut points', () => {
		expect(ratingMeaning(9.5)).toBe('Exceptional');
		expect(ratingMeaning(9.4)).toBe('Outstanding');
		expect(ratingMeaning(8.0)).toBe('Excellent');
		expect(ratingMeaning(7.0)).toBe('Strong');
		expect(ratingMeaning(6.0)).toBe('Solid');
		expect(ratingMeaning(5.0)).toBe('Developing');
		expect(ratingMeaning(4.9)).toBe('Limited impact');
	});
});
