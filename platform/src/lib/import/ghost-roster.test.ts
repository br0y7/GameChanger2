import { describe, expect, test } from 'bun:test';
import {
	ghostRosterMatches,
	isPlaceholderPlayerName,
	jerseyMatchKey,
	normalizeRosterName,
} from './ghost-roster';

describe('normalizeRosterName', () => {
	test('treats initials and extra punctuation as the same person', () => {
		expect(normalizeRosterName('J.R Nocon')).toBe('jr nocon');
		expect(normalizeRosterName('J.R. Nocon')).toBe('jr nocon');
		expect(normalizeRosterName('  Maynard   Pangan ')).toBe('maynard pangan');
	});
});

describe('isPlaceholderPlayerName', () => {
	test('skips import placeholders', () => {
		expect(isPlaceholderPlayerName('Player #5')).toBe(true);
		expect(isPlaceholderPlayerName('player 12')).toBe(true);
		expect(isPlaceholderPlayerName('Maynard Pangan')).toBe(false);
	});
});

describe('ghostRosterMatches', () => {
	test('drops a 0-GP copy of a Team 1 name that landed on Team 5', () => {
		expect(
			ghostRosterMatches([
				{
					id: 't1',
					name: 'Maynard Pangan',
					jerseyNumber: '4',
					teamId: 'team-1',
					gamesPlayed: 6,
				},
				{
					id: 't5',
					name: 'Maynard Pangan',
					jerseyNumber: '4',
					teamId: 'team-5',
					gamesPlayed: 0,
				},
			])
		).toEqual([{ ghostId: 't5', keeperId: 't1' }]);
	});

	test('does not delete a unique unused roster player', () => {
		expect(
			ghostRosterMatches([
				{
					id: 'only',
					name: 'New Dad',
					jerseyNumber: '99',
					teamId: 'team-5',
					gamesPlayed: 0,
				},
			])
		).toEqual([]);
	});

	test('leaves the same name on one team alone', () => {
		expect(
			ghostRosterMatches([
				{
					id: 'a',
					name: 'Maynard Pangan',
					jerseyNumber: '4',
					teamId: 'team-1',
					gamesPlayed: 6,
				},
				{
					id: 'b',
					name: 'Maynard Pangan',
					jerseyNumber: '14',
					teamId: 'team-1',
					gamesPlayed: 0,
				},
			])
		).toEqual([]);
	});

	test('does not pick a winner when both teams have games for that name', () => {
		expect(
			ghostRosterMatches([
				{
					id: 't1',
					name: 'Maynard Pangan',
					jerseyNumber: '4',
					teamId: 'team-1',
					gamesPlayed: 6,
				},
				{
					id: 't5',
					name: 'Maynard Pangan',
					jerseyNumber: '8',
					teamId: 'team-5',
					gamesPlayed: 2,
				},
			])
		).toEqual([]);
	});

	test('skips Player #N leftovers', () => {
		expect(
			ghostRosterMatches([
				{
					id: 't1',
					name: 'Player #5',
					jerseyNumber: '5',
					teamId: 'team-1',
					gamesPlayed: 3,
				},
				{
					id: 't5',
					name: 'Player #5',
					jerseyNumber: '5',
					teamId: 'team-5',
					gamesPlayed: 0,
				},
			])
		).toEqual([]);
	});

	test('single-token nicknames need the same jersey', () => {
		expect(
			ghostRosterMatches([
				{
					id: 't1',
					name: 'Ty',
					jerseyNumber: '1',
					teamId: 'team-1',
					gamesPlayed: 4,
				},
				{
					id: 't5',
					name: 'Ty',
					jerseyNumber: '9',
					teamId: 'team-5',
					gamesPlayed: 0,
				},
			])
		).toEqual([]);

		expect(
			ghostRosterMatches([
				{
					id: 't1',
					name: 'Ty',
					jerseyNumber: '01',
					teamId: 'team-1',
					gamesPlayed: 4,
				},
				{
					id: 't5',
					name: 'Ty',
					jerseyNumber: '1',
					teamId: 'team-5',
					gamesPlayed: 0,
				},
			])
		).toEqual([{ ghostId: 't5', keeperId: 't1' }]);
	});

	test('keeps both linked accounts when they belong to different users', () => {
		expect(
			ghostRosterMatches([
				{
					id: 't1',
					name: 'Maynard Pangan',
					jerseyNumber: '4',
					teamId: 'team-1',
					gamesPlayed: 6,
					userId: 'user-a',
				},
				{
					id: 't5',
					name: 'Maynard Pangan',
					jerseyNumber: '4',
					teamId: 'team-5',
					gamesPlayed: 0,
					userId: 'user-b',
				},
			])
		).toEqual([]);
	});
});

describe('jerseyMatchKey', () => {
	test('treats 01 and 1 as the same number', () => {
		expect(jerseyMatchKey('01')).toBe(jerseyMatchKey('1'));
		expect(jerseyMatchKey('00')).toBe('0');
	});
});
