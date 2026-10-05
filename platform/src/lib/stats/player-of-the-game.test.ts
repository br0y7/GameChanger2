import { describe, expect, test } from 'bun:test';
import { decideMvp } from './player-of-the-game';

function player(id: string, gameRating: number | null) {
	return { playerId: id, gameRating };
}

describe('decideMvp', () => {
	test('names the highest Game Rating as MVP when the lead is 0.4 or more', () => {
		const decision = decideMvp([
			player('a', 9.1),
			player('b', 8.6),
			player('c', 7.2),
		]);
		expect(decision.kind).toBe('mvp');
		expect(decision.players.map((row) => row.playerId)).toEqual(['a']);
	});

	test('presents both players when the top two ratings are within 0.3', () => {
		const decision = decideMvp([player('a', 8.7), player('b', 8.5), player('c', 7.1)]);
		expect(decision.kind).toBe('candidates');
		expect(decision.players.map((row) => row.playerId)).toEqual(['a', 'b']);
	});

	test('does not invent an MVP from unrated box scores', () => {
		expect(decideMvp([player('a', null), player('b', null)]).kind).toBe('none');
	});

	test('does not let a lower rating win because of one counting stat', () => {
		const decision = decideMvp([
			{ playerId: 'scorer', gameRating: 8.4, pts: 16 },
			{ playerId: 'steals', gameRating: 8.8, pts: 6 },
		]);
		expect(decision.kind).toBe('mvp');
		expect(decision.players[0].playerId).toBe('steals');
	});
});
