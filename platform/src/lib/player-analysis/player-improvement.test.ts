import { describe, expect, test } from 'bun:test';
import type { Game } from '$lib/server/db/schema';
import type { PlayerGameStats, WithGame } from '$lib/schemas/player-game-stat';
import {
	formatImprovementChange,
	playerProgressFromGames,
	recentWindowSize,
} from './player-improvement';

function line(opts: {
	day: number;
	seasonId?: string;
	pts?: number;
	reb?: number;
	ast?: number;
	fgm?: number;
	fga?: number;
	fg3m?: number;
	fg3a?: number;
	ftm?: number;
	fta?: number;
	pointsOnly?: boolean;
}): WithGame<PlayerGameStats> {
	const fgm = opts.fgm ?? 0;
	const fga = opts.fga ?? 0;
	const fg3m = opts.fg3m ?? 0;
	const fg3a = opts.fg3a ?? 0;
	const ftm = opts.ftm ?? 0;
	const fta = opts.fta ?? 0;
	const reb = opts.reb ?? 0;
	const ast = opts.ast ?? 0;
	const pts = opts.pts ?? 0;
	const day = String(opts.day).padStart(2, '0');

	return {
		fgm,
		fga,
		fg3m,
		fg3a,
		ftm,
		fta,
		oreb: 0,
		dreb: reb,
		ast,
		stl: 0,
		blk: 0,
		tov: 0,
		pf: 0,
		pts,
		fgPct: fga > 0 ? fgm / fga : 0,
		fg3Pct: fg3a > 0 ? fg3m / fg3a : 0,
		ftPct: fta > 0 ? ftm / fta : 0,
		reb,
		eff: 0,
		pointsOnly: opts.pointsOnly ?? false,
		game: {
			id: `g-${opts.seasonId ?? 's8'}-${day}`,
			homeTeamId: 'home',
			awayTeamId: 'away',
			seasonId: opts.seasonId ?? 's8',
			completedAt: new Date(`2026-01-${day}T12:00:00.000Z`),
			scheduledAt: new Date(`2026-01-${day}T12:00:00.000Z`),
		} as Game,
	} as WithGame<PlayerGameStats>;
}

describe('recentWindowSize', () => {
	test('uses last 5 when the season has at least 5 games', () => {
		expect(recentWindowSize(5)).toBe(5);
		expect(recentWindowSize(12)).toBe(5);
	});

	test('uses last 3 when the season has 3 or 4 games', () => {
		expect(recentWindowSize(3)).toBe(3);
		expect(recentWindowSize(4)).toBe(3);
	});

	test('waits for more games before showing a trend', () => {
		expect(recentWindowSize(2)).toBeNull();
	});
});

describe('playerProgressFromGames', () => {
	test('compares season average with the last 5 games', () => {
		const games = [
			line({ day: 1, pts: 10 }),
			line({ day: 2, pts: 10 }),
			line({ day: 3, pts: 10 }),
			line({ day: 4, pts: 10 }),
			line({ day: 5, pts: 10 }),
			line({ day: 6, pts: 20 }),
			line({ day: 7, pts: 20 }),
			line({ day: 8, pts: 20 }),
			line({ day: 9, pts: 20 }),
			line({ day: 10, pts: 20 }),
		];
		const progress = playerProgressFromGames(games, 's8');
		const points = progress.metrics.find((metric) => metric.key === 'points');
		expect(progress.recentWindow).toBe(5);
		expect(points?.season).toBe(15);
		expect(points?.recent).toBe(20);
		expect(points?.trend).toBe('up');
		expect(formatImprovementChange(points!)).toBe('+33%');
	});

	test('calculates FG% from total makes and attempts, not an average of game percentages', () => {
		const games = [
			line({ day: 1, fgm: 1, fga: 1, pts: 2 }),
			line({ day: 2, fgm: 1, fga: 1, pts: 2 }),
			line({ day: 3, fgm: 0, fga: 8, pts: 0 }),
		];
		const progress = playerProgressFromGames(games, 's8');
		const fg = progress.metrics.find((metric) => metric.key === 'fgPct');
		expect(fg?.season).toBeCloseTo(2 / 10);
		expect(fg?.season).not.toBeCloseTo((1 + 1 + 0) / 3);
	});

	test('does not treat points-only games as zero rebounds or shooting', () => {
		const games = [
			line({ day: 1, pts: 12, reb: 6, ast: 3, fgm: 5, fga: 10 }),
			line({ day: 2, pts: 8, pointsOnly: true }),
			line({ day: 3, pts: 10, reb: 4, ast: 1, fgm: 4, fga: 10 }),
		];
		const progress = playerProgressFromGames(games, 's8');
		const rebounds = progress.metrics.find((metric) => metric.key === 'rebounds');
		const fg = progress.metrics.find((metric) => metric.key === 'fgPct');
		const points = progress.metrics.find((metric) => metric.key === 'points');
		expect(points?.season).toBe(11);
		expect(rebounds?.season).toBe(5);
		expect(fg?.season).toBeCloseTo(9 / 20);
	});

	test('keeps progress inside one season', () => {
		const games = [
			line({ day: 1, seasonId: 's7', pts: 30, reb: 12, ast: 8, fgm: 12, fga: 20 }),
			line({ day: 2, seasonId: 's8', pts: 8, reb: 2, ast: 1, fgm: 3, fga: 10 }),
			line({ day: 3, seasonId: 's8', pts: 10, reb: 4, ast: 2, fgm: 4, fga: 10 }),
			line({ day: 4, seasonId: 's8', pts: 12, reb: 6, ast: 3, fgm: 5, fga: 10 }),
		];
		const progress = playerProgressFromGames(games, 's8');
		const points = progress.metrics.find((metric) => metric.key === 'points');
		expect(progress.seasonGameCount).toBe(3);
		expect(points?.season).toBe(10);
	});

	test('shows shooting as unavailable when no attempts were recorded', () => {
		const games = [
			line({ day: 1, pts: 6, pointsOnly: true }),
			line({ day: 2, pts: 8, pointsOnly: true }),
			line({ day: 3, pts: 10, pointsOnly: true }),
		];
		const progress = playerProgressFromGames(games, 's8');
		const fg = progress.metrics.find((metric) => metric.key === 'fgPct');
		expect(fg?.season).toBeNull();
		expect(fg?.recent).toBeNull();
		expect(formatImprovementChange(fg!)).toBeNull();
	});

	test('writes a short development summary from the main stats', () => {
		const games = [
			line({ day: 1, pts: 8, reb: 4, ast: 2, fgm: 3, fga: 10 }),
			line({ day: 2, pts: 8, reb: 4, ast: 2, fgm: 3, fga: 10 }),
			line({ day: 3, pts: 16, reb: 6, ast: 4, fgm: 6, fga: 10 }),
			line({ day: 4, pts: 16, reb: 6, ast: 4, fgm: 6, fga: 10 }),
			line({ day: 5, pts: 16, reb: 6, ast: 4, fgm: 6, fga: 10 }),
			line({ day: 6, pts: 16, reb: 6, ast: 4, fgm: 6, fga: 10 }),
			line({ day: 7, pts: 16, reb: 6, ast: 4, fgm: 6, fga: 10 }),
		];
		const progress = playerProgressFromGames(games, 's8');
		expect(progress.summary).toContain('scoring is up');
		expect(progress.summary).toContain('last 5 games');
	});
});
