import { describe, expect, test } from 'bun:test';
import type { PlayerGameStats } from '$lib/schemas/player-game-stat';
import { leaderAveragesFromGames, seasonAveragesFromGames } from './season-averages';

function line(opts: { pts: number; reb?: number; ast?: number; pointsOnly?: boolean }): PlayerGameStats {
	return {
		fgm: 0,
		fga: 0,
		fg3m: 0,
		fg3a: 0,
		ftm: 0,
		fta: 0,
		oreb: 0,
		dreb: opts.reb ?? 0,
		ast: opts.ast ?? 0,
		stl: 0,
		blk: 0,
		tov: 0,
		pf: 0,
		pts: opts.pts,
		fgPct: 0,
		fg3Pct: 0,
		ftPct: 0,
		reb: opts.reb ?? 0,
		eff: 0,
		pointsOnly: opts.pointsOnly ?? false,
	} as PlayerGameStats;
}

describe('leaderAveragesFromGames', () => {
	test('does not count a points-only team in leader averages', () => {
		expect(
			leaderAveragesFromGames([
				line({ pts: 18, pointsOnly: true }),
				line({ pts: 22, pointsOnly: true }),
			])
		).toBeNull();
	});

	test('averages only full box-score games', () => {
		const averages = leaderAveragesFromGames([
			line({ pts: 20, pointsOnly: true }),
			line({ pts: 10, reb: 4, ast: 2 }),
			line({ pts: 6, reb: 2, ast: 0 }),
		]);

		expect(averages?.gamesPlayed).toBe(2);
		expect(averages?.points).toBe(8);
		expect(averages?.rebounds).toBe(3);
		expect(averages?.assists).toBe(1);
	});
});

describe('seasonAveragesFromGames', () => {
	test('does not count points-only games in any average', () => {
		const averages = seasonAveragesFromGames([
			line({ pts: 20, pointsOnly: true }),
			line({ pts: 10, reb: 4 }),
		]);

		expect(averages.gamesPlayed).toBe(1);
		expect(averages.points).toBe(10);
		expect(averages.rebounds).toBe(4);
	});
});
