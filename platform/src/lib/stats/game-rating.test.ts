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
	test('uses the Game Score–style weights', () => {
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
		// 30 + 0.4*12 - 0.7*20 - 0.4*2 + 0.7*11 + 0.3*15 + 0.7 + 1 + 0.7 - 8 - 0.4*2
		expect(parts.impact).toBeCloseTo(25.8, 5);
	});

	test('keeps a 16-point efficient line close to 6 points with 8 boards and 4 steals', () => {
		const scorer = impactParts(
			line({ fgm: 6, fga: 12, fg3m: 2, fg3a: 2, ftm: 2, fta: 5, tov: 2 })
		);
		const defender = impactParts(line({ fgm: 2, fga: 9, ftm: 2, fta: 2, dreb: 8, stl: 4 }));
		expect(scorer.points).toBe(16);
		expect(defender.points).toBe(6);
		expect(scorer.impact).toBeCloseTo(6.8, 5);
		expect(defender.impact).toBeCloseTo(6.9, 5);
		expect(Math.abs(scorer.impact - defender.impact)).toBeLessThan(0.3);
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
		expect(baseRatingFromPercentile(0)).toBeCloseTo(3.0, 5);
		expect(baseRatingFromPercentile(50)).toBeCloseTo(7.0, 5);
		expect(baseRatingFromPercentile(75)).toBeCloseTo(7.8, 5);
		expect(baseRatingFromPercentile(90)).toBeCloseTo(8.6, 5);
		expect(baseRatingFromPercentile(97)).toBeCloseTo(9.3, 5);
		expect(baseRatingFromPercentile(99.5)).toBeCloseTo(9.8, 5);
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
			impactParts(
				line({ fgm: index % 8, fga: 10, ftm: index % 3, dreb: index % 5, ast: index % 4 })
			)
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
		expect(rated!.ratingVersion).toBe('GC-v2');
		expect(rated!.rating).toBeGreaterThanOrEqual(8);
		expect(rated!.rating).toBeLessThanOrEqual(10);
		expect(rated!.contextBonus).toBe(0);
		expect(rated!.breakdown.gameContext).toBe('Exceptional');
		expect(rated!.meaning).toBe(ratingMeaning(rated!.rating));
		expect(roundRating(rated!.rating)).toBe(rated!.rating);
	});

	test('does not add team scoring share to the official rating', () => {
		const samples = Array.from({ length: 40 }, (_, index) =>
			impactParts(line({ fgm: 4, fga: 10, dreb: index % 4 }))
		);
		const scorer = line({ fgm: 10, fga: 20, ftm: 4, fta: 4 });
		samples.push(impactParts(scorer));
		const scale = buildRatingScale(samples);
		const lowShare = computeGameRating({ line: scorer, teamPoints: 100, scale });
		const highShare = computeGameRating({ line: scorer, teamPoints: 24, scale });
		expect(lowShare!.rating).toBe(highShare!.rating);
		expect(highShare!.contextBonus).toBe(0);
		expect(highShare!.breakdown.gameContext).toBe('Exceptional');
	});

	test('returns null without a scale or without a stat line', () => {
		const scale = buildRatingScale([]);
		expect(computeGameRating({ line: line({ fgm: 4, fga: 8 }), teamPoints: 40, scale })).toBeNull();
		expect(
			computeGameRating({
				line: line({ fgm: 4, fga: 8 }),
				teamPoints: 40,
				scale: undefined as unknown as typeof scale,
			})
		).toBeNull();
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
