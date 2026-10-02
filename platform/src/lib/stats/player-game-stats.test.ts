import { describe, expect, test } from 'bun:test';
import {
	derivePlayerGameStats,
	isPointsOnlyLine,
	playerAppearedOnSheet,
} from './player-game-stats';

describe('playerAppearedOnSheet', () => {
	test('counts a points-only line, including a zero', () => {
		expect(playerAppearedOnSheet({ recordedPts: 8, fgm: 0, ast: 0 })).toBe(true);
		expect(playerAppearedOnSheet({ recordedPts: 0, fgm: 0, ast: 0 })).toBe(true);
	});

	test('counts a box-score line with any counting stat', () => {
		expect(playerAppearedOnSheet({ recordedPts: null, fgm: 0, ast: 2, stl: 0 })).toBe(true);
	});

	test('uses the sheet PTS column even when shots are also filled', () => {
		expect(
			derivePlayerGameStats({
				recordedPts: 12,
				fgm: 7,
				fga: 14,
				fg3m: 0,
				fg3a: 2,
				ftm: 3,
				fta: 4,
				oreb: 1,
				dreb: 2,
				ast: 0,
				stl: 0,
				blk: 0,
				tov: 0,
				pf: 0,
			} as Parameters<typeof derivePlayerGameStats>[0]).pts
		).toBe(12);
		expect(
			isPointsOnlyLine({
				recordedPts: 12,
				fgm: 7,
				fga: 14,
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

	test('treats a PTS-only row as points-only', () => {
		expect(
			isPointsOnlyLine({
				recordedPts: 12,
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
		).toBe(true);
	});

	test('caps FG% at 100% when attempts were left blank', () => {
		expect(
			derivePlayerGameStats({
				recordedPts: null,
				fgm: 11,
				fga: 0,
				fg3m: 1,
				fg3a: 3,
				ftm: 2,
				fta: 4,
				oreb: 0,
				dreb: 0,
				ast: 0,
				stl: 0,
				blk: 0,
				tov: 0,
				pf: 0,
			} as Parameters<typeof derivePlayerGameStats>[0]).fgPct
		).toBe(1);
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
