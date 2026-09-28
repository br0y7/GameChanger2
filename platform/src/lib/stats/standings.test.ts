import { describe, expect, test } from 'bun:test';
import { regularSeasonStandings, type StandingGame } from './standings';

function game(
	id: string,
	homeTeamId: string,
	awayTeamId: string,
	homeTeamScore: number,
	awayTeamScore: number,
	day: number,
	gameType = 'regular'
): StandingGame {
	return {
		id,
		homeTeamId,
		awayTeamId,
		homeTeamScore,
		awayTeamScore,
		gameType,
		status: 'completed',
		statsAvailable: true,
		completedAt: new Date(Date.UTC(2026, 0, day, 18)),
		scheduledAt: null,
	};
}

describe('regularSeasonStandings', () => {
	test('a 5-3 team ranks above a 1-7 team', () => {
		const games: StandingGame[] = [
			...[1, 2, 3, 4, 5].map((day) => game(`w${day}`, 'five', 'one', 20, 10, day)),
			...[6, 7, 8].map((day) => game(`l${day}`, 'better', 'five', 20, 10, day)),
			...[9, 10].map((day) => game(`o${day}`, 'better', 'one', 20, 10, day)),
			game('upset', 'one', 'better', 12, 9, 11),
		];

		const rows = regularSeasonStandings(['better', 'five', 'one'], games);
		const five = rows.find((row) => row.teamId === 'five');
		const one = rows.find((row) => row.teamId === 'one');

		expect(five).toMatchObject({ wins: 5, losses: 3, rank: 2 });
		expect(one).toMatchObject({ wins: 1, losses: 7, rank: 3 });
		expect(five!.rank).not.toBe(one!.rank);
	});

	test('a playoff game on the same day does not erase the regular-season win', () => {
		const games = [
			game('regular', 'a', 'b', 40, 30, 10, 'regular'),
			game('playoff', 'a', 'b', 10, 50, 10, 'playoff'),
		];

		const rows = regularSeasonStandings(['a', 'b'], games);
		expect(rows.find((row) => row.teamId === 'a')).toMatchObject({ wins: 1, losses: 0, rank: 1 });
		expect(rows.find((row) => row.teamId === 'b')).toMatchObject({ wins: 0, losses: 1, rank: 2 });
	});

	test('two teams with the same record are split by head-to-head, not point differential', () => {
		const games = [
			game('h2h', 'a', 'b', 11, 10, 1),
			game('a-loss', 'c', 'a', 50, 10, 2),
			game('a-win', 'a', 'd', 11, 10, 3),
			game('b-win-c', 'b', 'c', 40, 10, 4),
			game('b-win-d', 'b', 'd', 40, 10, 5),
		];
		const rows = regularSeasonStandings(['a', 'b', 'c', 'd'], games);
		expect(rows.find((row) => row.teamId === 'a')).toMatchObject({ wins: 2, losses: 1, rank: 1 });
		expect(rows.find((row) => row.teamId === 'b')).toMatchObject({ wins: 2, losses: 1, rank: 2 });
	});
});
