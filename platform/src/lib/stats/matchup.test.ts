import { describe, expect, test } from 'bun:test';
import { dedupeByMatchup, dedupeMatchups, type MatchupIdentity } from './matchup';

function game(overrides: Partial<MatchupIdentity> & Pick<MatchupIdentity, 'id'>): MatchupIdentity {
	return {
		homeTeamId: 'home',
		awayTeamId: 'away',
		gameType: 'regular',
		status: 'completed',
		statsAvailable: true,
		homeTeamScore: 40,
		awayTeamScore: 30,
		completedAt: new Date('2026-01-10T18:00:00Z'),
		scheduledAt: null,
		...overrides,
	};
}

describe('dedupeMatchups', () => {
	test('keeps one listing when home and away are swapped on the same day', () => {
		const kept = dedupeMatchups([
			game({ id: 'a', homeTeamId: 'blue', awayTeamId: 'red' }),
			game({ id: 'b', homeTeamId: 'red', awayTeamId: 'blue', homeTeamScore: 0, awayTeamScore: 0 }),
		]);

		expect(kept.map((row) => row.id)).toEqual(['a']);
	});

	test('keeps games on different days', () => {
		const kept = dedupeMatchups([
			game({ id: 'a', completedAt: new Date('2026-01-10T18:00:00Z') }),
			game({ id: 'b', completedAt: new Date('2026-02-10T18:00:00Z') }),
		]);

		expect(kept.map((row) => row.id).sort()).toEqual(['a', 'b']);
	});

	test('drops a regular-season copy of a playoff game', () => {
		const kept = dedupeMatchups([
			game({ id: 'regular', gameType: 'regular' }),
			game({ id: 'semi', gameType: 'semifinal' }),
		]);

		expect(kept.map((row) => row.id)).toEqual(['semi']);
	});
});

describe('dedupeByMatchup', () => {
	test('keeps the stat line for the surviving game', () => {
		const stats = [
			{ pts: 4, game: game({ id: 'a' }) },
			{ pts: 9, game: game({ id: 'b', homeTeamId: 'away', awayTeamId: 'home' }) },
		];
		const kept = dedupeByMatchup(stats, (stat) => stat.game);
		expect(kept).toHaveLength(1);
		expect(kept[0]?.game.id).toBe('a');
	});

	test('keeps one line when the same game id is listed twice', () => {
		const shared = game({ id: 'same' });
		const kept = dedupeByMatchup(
			[
				{ pts: 1, game: shared },
				{ pts: 2, game: shared },
			],
			(stat) => stat.game
		);
		expect(kept).toHaveLength(1);
		expect(kept[0]?.pts).toBe(1);
	});
});
