import { describe, expect, test } from 'bun:test';
import { resolveGameScores, scoresForTeam } from './game-scores';

describe('resolveGameScores', () => {
	test('keeps a stored point total', () => {
		expect(
			resolveGameScores({
				homeTeamId: 'h',
				awayTeamId: 'a',
				homeTeamScore: 41,
				awayTeamScore: 38,
			})
		).toEqual({ home: 41, away: 38 });
	});

	test('sums player points when the game row is still 0–0', () => {
		expect(
			resolveGameScores({
				homeTeamId: 'h',
				awayTeamId: 'a',
				homeTeamScore: 0,
				awayTeamScore: 0,
				playerStats: [
					{ fgm: 0, fg3m: 0, ftm: 0, recordedPts: 22, player: { teamId: 'h' } },
					{ fgm: 0, fg3m: 0, ftm: 0, recordedPts: 18, player: { teamId: 'a' } },
				],
			})
		).toEqual({ home: 22, away: 18 });
	});
});

describe('scoresForTeam', () => {
	test('labels a win from the summed box score', () => {
		expect(
			scoresForTeam(
				{
					homeTeamId: 'h',
					awayTeamId: 'a',
					homeTeamScore: 0,
					awayTeamScore: 0,
					playerStats: [
						{ fgm: 5, fg3m: 1, ftm: 2, player: { teamId: 'h' } },
						{ fgm: 3, fg3m: 0, ftm: 1, player: { teamId: 'a' } },
					],
				},
				'h'
			)
		).toEqual({ isHome: true, teamScore: 13, oppScore: 7, result: 'W' });
	});
});
