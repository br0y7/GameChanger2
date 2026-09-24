import { describe, expect, test } from 'bun:test';
import { divisionPlaceForTeam, divisionPlaceLabel, type PlacementGame } from './division-place';

const finals: PlacementGame = {
	gameType: 'finals',
	homeTeamId: 'a',
	awayTeamId: 'b',
	homeScore: 60,
	awayScore: 54,
	completedAt: 3,
};

const third: PlacementGame = {
	gameType: 'third_place',
	homeTeamId: 'c',
	awayTeamId: 'd',
	homeScore: 40,
	awayScore: 48,
	completedAt: 2,
};

describe('divisionPlaceForTeam', () => {
	test('finals winner is the division winner and the loser is 2nd', () => {
		const games = [finals, third];
		expect(divisionPlaceForTeam('a', games)).toBe('division_winner');
		expect(divisionPlaceForTeam('b', games)).toBe('second');
		expect(divisionPlaceLabel('division_winner')).toBe('Division winner');
		expect(divisionPlaceLabel('second')).toBe('2nd');
	});

	test('third-place winner is 3rd and the loser is 4th', () => {
		const games = [finals, third];
		expect(divisionPlaceForTeam('d', games)).toBe('third');
		expect(divisionPlaceForTeam('c', games)).toBe('fourth');
	});

	test('a first-round exit stays Playoffs first round', () => {
		const games: PlacementGame[] = [
			finals,
			third,
			{
				gameType: 'playoff',
				homeTeamId: 'e',
				awayTeamId: 'f',
				homeScore: 1,
				awayScore: 0,
				completedAt: 1,
			},
		];
		expect(divisionPlaceForTeam('e', games)).toBe('first_round');
		expect(divisionPlaceForTeam('f', games)).toBe('first_round');
		expect(divisionPlaceLabel('first_round')).toBe('Playoffs first round');
	});

	test('a semis exit is not labeled as the first round', () => {
		const games: PlacementGame[] = [
			{
				gameType: 'playoff',
				homeTeamId: 'e',
				awayTeamId: 'f',
				homeScore: 70,
				awayScore: 60,
				completedAt: 1,
			},
			{
				gameType: 'semifinal',
				homeTeamId: 'e',
				awayTeamId: 'g',
				homeScore: 50,
				awayScore: 55,
				completedAt: 2,
			},
		];
		expect(divisionPlaceForTeam('e', games)).toBe('semis_lost');
		expect(divisionPlaceLabel('semis_lost')).toBe('Semis lost or (3rd)');
		expect(divisionPlaceForTeam('f', games)).toBe('first_round');
	});

	test('a semis loss with no third-place game is Semis lost or (3rd)', () => {
		const games: PlacementGame[] = [
			{
				gameType: 'semifinal',
				homeTeamId: 'a',
				awayTeamId: 'c',
				homeScore: 62,
				awayScore: 51,
				completedAt: 1,
			},
			{
				gameType: 'finals',
				homeTeamId: 'a',
				awayTeamId: 'b',
				homeScore: 70,
				awayScore: 66,
				completedAt: 2,
			},
		];
		expect(divisionPlaceForTeam('a', games)).toBe('division_winner');
		expect(divisionPlaceForTeam('b', games)).toBe('second');
		expect(divisionPlaceForTeam('c', games)).toBe('semis_lost');
	});

	test('a semis loser who plays the third-place game keeps that result', () => {
		const games: PlacementGame[] = [
			{
				gameType: 'semifinal',
				homeTeamId: 'c',
				awayTeamId: 'a',
				homeScore: 40,
				awayScore: 55,
				completedAt: 1,
			},
			third,
			finals,
		];
		expect(divisionPlaceForTeam('c', games)).toBe('fourth');
	});

	test('regular-season teams have no playoff place', () => {
		expect(
			divisionPlaceForTeam('a', [
				{
					gameType: 'regular',
					homeTeamId: 'a',
					awayTeamId: 'b',
					homeScore: 10,
					awayScore: 8,
					completedAt: 1,
				},
			])
		).toBeNull();
	});
});
