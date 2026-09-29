import { describe, expect, test } from 'bun:test';
import { playerAppearedOnSheet } from './player-game-stats';

describe('playerAppearedOnSheet', () => {
	test('counts a points-only line, including a zero', () => {
		expect(playerAppearedOnSheet({ recordedPts: 8, fgm: 0, ast: 0 })).toBe(true);
		expect(playerAppearedOnSheet({ recordedPts: 0, fgm: 0, ast: 0 })).toBe(true);
	});

	test('counts a box-score line with any counting stat', () => {
		expect(playerAppearedOnSheet({ recordedPts: null, fgm: 0, ast: 2, stl: 0 })).toBe(true);
	});

	test('drops an empty row from a game the player missed', () => {
		expect(
			playerAppearedOnSheet({
				recordedPts: null,
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
			})
		).toBe(false);
	});
});
