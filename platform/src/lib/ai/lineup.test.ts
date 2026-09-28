import { describe, expect, test } from 'bun:test';
import {
	formatLineupContext,
	lineupPlayerFromGames,
	rankLineup,
	starterScore,
	type LineupGame,
	type LineupPlayer,
} from './lineup';

function player(overrides: Partial<LineupPlayer> = {}): LineupPlayer {
	return {
		playerId: overrides.playerId ?? overrides.jerseyNumber ?? '1',
		name: 'Ada',
		jerseyNumber: '1',
		gamesPlayed: 4,
		points: 0,
		rebounds: 0,
		assists: 0,
		hasBoxScore: true,
		offensiveRebounds: 0,
		defensiveRebounds: 0,
		steals: 0,
		blocks: 0,
		turnovers: 0,
		fouls: 0,
		fgPct: null,
		fg3Pct: null,
		ftPct: null,
		trueShootingPct: null,
		averageGameRating: null,
		recentForm: null,
		...overrides,
	};
}

function game(overrides: Partial<LineupGame> = {}): LineupGame {
	return {
		pointsOnly: false,
		pts: 0,
		oreb: 0,
		dreb: 0,
		ast: 0,
		stl: 0,
		blk: 0,
		tov: 0,
		pf: 0,
		fgm: 0,
		fga: 0,
		fg3m: 0,
		fg3a: 0,
		ftm: 0,
		fta: 0,
		gameRating: null,
		playedAt: null,
		...overrides,
	};
}

describe('starterScore', () => {
	const base = player({
		points: 10,
		offensiveRebounds: 2,
		defensiveRebounds: 4,
		assists: 3,
		steals: 1,
		blocks: 1,
		turnovers: 2,
		fouls: 5,
	});

	test('weights scoring, boards, playmaking, defence, and ball security', () => {
		expect(starterScore(base)).toBeCloseTo(19.5, 5);
	});

	test('adjusts for true shooting and skips the adjustment when attempts are missing', () => {
		expect(starterScore({ ...base, trueShootingPct: 0.55 })).toBeCloseTo(20.5, 5);
		expect(starterScore({ ...base, trueShootingPct: 0.5 })).toBeCloseTo(20, 5);
		expect(starterScore({ ...base, trueShootingPct: 0.4 })).toBeCloseTo(19.5, 5);
		expect(starterScore({ ...base, trueShootingPct: 0.39 })).toBeCloseTo(19, 5);
		expect(starterScore({ ...base, trueShootingPct: null })).toBeCloseTo(19.5, 5);
	});
});

describe('rankLineup', () => {
	test('uses average Game Rating ahead of a higher starter score', () => {
		const ranked = rankLineup([
			player({
				name: 'Scorer',
				jerseyNumber: '1',
				points: 30,
				averageGameRating: 5,
			}),
			player({
				name: 'Rated',
				jerseyNumber: '8',
				points: 4,
				averageGameRating: 8,
			}),
		]);

		expect(ranked.usedGameRating).toBe(true);
		expect(ranked.ordered.map((p) => p.jerseyNumber)).toEqual(['8', '1']);
	});

	test('places players without a rating after rated players', () => {
		const ranked = rankLineup([
			player({ name: 'Unrated', jerseyNumber: '9', points: 40, averageGameRating: null }),
			player({ name: 'Rated', jerseyNumber: '2', points: 1, averageGameRating: 6.1 }),
		]);

		expect(ranked.ordered.map((p) => p.name)).toEqual(['Rated', 'Unrated']);
	});

	test('breaks equal ratings with recent form, then PPG, then name', () => {
		const ranked = rankLineup([
			player({
				name: 'Zoe',
				jerseyNumber: '3',
				points: 8,
				averageGameRating: 7,
				recentForm: 0.2,
			}),
			player({
				name: 'Ada',
				jerseyNumber: '4',
				points: 8,
				averageGameRating: 7,
				recentForm: 0.2,
			}),
			player({
				name: 'Cold',
				jerseyNumber: '5',
				points: 20,
				averageGameRating: 7,
				recentForm: -0.4,
			}),
			player({
				name: 'Hot',
				jerseyNumber: '6',
				points: 2,
				averageGameRating: 7,
				recentForm: 0.6,
			}),
			player({
				name: 'MorePoints',
				jerseyNumber: '7',
				points: 12,
				averageGameRating: 7,
				recentForm: 0.2,
			}),
		]);

		expect(ranked.ordered.map((p) => p.name)).toEqual(['Hot', 'MorePoints', 'Ada', 'Zoe', 'Cold']);
	});

	test('falls back to starter score when nobody has a Game Rating', () => {
		const ranked = rankLineup([
			player({ name: 'Low', jerseyNumber: '1', points: 9, steals: 0 }),
			player({ name: 'High', jerseyNumber: '2', points: 4, steals: 4 }),
		]);

		expect(ranked.usedGameRating).toBe(false);
		expect(ranked.starters.map((p) => p.name)).toEqual(['High', 'Low']);
		expect(ranked.sixth).toBeNull();
	});

	test('takes the first five as starters and the sixth as 6th man', () => {
		const ranked = rankLineup(
			['1', '2', '3', '4', '5', '6', '7'].map((jerseyNumber) =>
				player({
					name: `P${jerseyNumber}`,
					jerseyNumber,
					points: Number(jerseyNumber),
				})
			)
		);

		expect(ranked.starters.map((p) => p.jerseyNumber)).toEqual(['7', '6', '5', '4', '3']);
		expect(ranked.sixth?.jerseyNumber).toBe('2');
	});
});

describe('lineupPlayerFromGames', () => {
	test('does not treat a points-only line as 0% shooting', () => {
		const profile = lineupPlayerFromGames({ playerId: 'p', name: 'Only', jerseyNumber: '11' }, [
			game({ pointsOnly: true, pts: 8, gameRating: null }),
		]);

		expect(profile?.points).toBe(8);
		expect(profile?.hasBoxScore).toBe(false);
		expect(profile?.offensiveRebounds).toBeNull();
		expect(profile?.trueShootingPct).toBeNull();
		expect(profile ? starterScore(profile) : 0).toBe(8);
	});

	test('averages box rates, shooting, and recent form from the latest rated games', () => {
		const profile = lineupPlayerFromGames({ playerId: 'p', name: 'Box', jerseyNumber: '13' }, [
			game({
				pts: 4,
				oreb: 1,
				dreb: 1,
				fga: 4,
				fgm: 2,
				gameRating: 10,
				playedAt: new Date('2026-01-01'),
			}),
			game({
				pts: 4,
				oreb: 1,
				dreb: 1,
				fga: 4,
				fgm: 2,
				gameRating: 10,
				playedAt: new Date('2026-01-02'),
			}),
			game({
				pts: 4,
				oreb: 1,
				dreb: 1,
				fga: 4,
				fgm: 2,
				gameRating: 10,
				playedAt: new Date('2026-01-03'),
			}),
			game({
				pts: 4,
				oreb: 1,
				dreb: 3,
				ast: 2,
				stl: 1,
				fga: 4,
				fgm: 2,
				fta: 0,
				gameRating: 4,
				playedAt: new Date('2026-01-04'),
			}),
		]);

		expect(profile?.rebounds).toBe(2.5);
		expect(profile?.defensiveRebounds).toBe(1.5);
		expect(profile?.fgPct).toBe(0.5);
		expect(profile?.averageGameRating).toBe(8.5);
		expect(profile?.recentForm).toBe(-0.5);
	});
});

describe('formatLineupContext', () => {
	test('states the team, the five, and hides unrecorded box stats', () => {
		const text = formatLineupContext('Dark Blue', [
			player({
				name: 'Board',
				jerseyNumber: '13',
				points: 2,
				rebounds: 4.3,
				offensiveRebounds: 1,
				defensiveRebounds: 3.3,
				hasBoxScore: true,
				averageGameRating: 7,
			}),
			player({
				name: 'Points Only',
				jerseyNumber: '4',
				points: 6,
				hasBoxScore: false,
				offensiveRebounds: null,
				defensiveRebounds: null,
				steals: null,
				blocks: null,
				turnovers: null,
				fouls: null,
				assists: 0,
				rebounds: 0,
				averageGameRating: 6,
			}),
		]);

		expect(text).toContain('Team: Dark Blue');
		expect(text).toContain('Do not ask the coach to confirm the team or choose a division.');
		expect(text).toContain("I'd start #13 and #4.");
		expect(text).toContain('Rebounds: #13 (4.3 RPG)');
		expect(text).toContain('#4 Points Only: 6.0 PPG');
		expect(text).not.toContain('#4 Points Only: 6.0 PPG, 0.0 ORPG');
		expect(text).toContain('Ranking detail');
		expect(text).toContain('reveal only if they ask how you ranked them');
	});
});
