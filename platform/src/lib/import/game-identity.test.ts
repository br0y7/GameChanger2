import { describe, expect, test } from 'bun:test';
import { mergeImportedGames, staleDivisionGameIds } from './game-identity';

function game(home: string, away: string, playedOn: string) {
	return {
		playedOn,
		completedAt: new Date('2026-08-01T15:00:00.000Z'),
		homeTeam: { name: home },
		awayTeam: { name: away },
	};
}

describe('mergeImportedGames', () => {
	test('keeps a team that is missing from the next sheet', () => {
		const existing = [game('Red', 'Blue', 'Jul 26, 2026'), game('Brown', 'White', 'Aug 1, 2026')];
		const incoming = [
			game('Brown', 'White', 'Aug 15, 2026'),
			game('Green', 'Blue', 'Aug 15, 2026'),
		];

		const merged = mergeImportedGames(existing, incoming);

		expect(
			merged.map((row) => `${row.homeTeam.name} vs ${row.awayTeam.name} ${row.playedOn}`)
		).toEqual([
			'Red vs Blue Jul 26, 2026',
			'Brown vs White Aug 1, 2026',
			'Brown vs White Aug 15, 2026',
			'Green vs Blue Aug 15, 2026',
		]);
	});

	test('updates the same teams on the same day and leaves the other games', () => {
		const existing = [game('Red', 'Blue', 'Jul 26, 2026'), game('Brown', 'White', 'Aug 1, 2026')];
		const updated = { ...game('Brown', 'White', 'Aug 1, 2026'), pointsOnly: true };
		const merged = mergeImportedGames(existing, [updated]);

		expect(merged).toHaveLength(2);
		expect(merged[0]?.homeTeam.name).toBe('Red');
		expect(merged[1]).toMatchObject({ pointsOnly: true });
	});
});

describe('staleDivisionGameIds', () => {
	test('drops a division game that the new sheet left out', () => {
		const divisionTeams = new Set(['red', 'blue']);
		const games = [
			{ id: 'kept', homeTeamId: 'red', awayTeamId: 'blue' },
			{ id: 'old', homeTeamId: 'blue', awayTeamId: 'red' },
			{ id: 'other-division', homeTeamId: 'gold', awayTeamId: 'green' },
		];

		expect(staleDivisionGameIds(games, divisionTeams, new Set(['kept']))).toEqual(['old']);
	});
});
