import { describe, expect, test } from 'bun:test';
import { pickExistingTeam, readableTeamName } from './team-match';

const division = [
	{ name: 'Team Red', slug: 'team-red' },
	{ name: 'Blue', slug: 'blue' },
	{ name: 'WHITE', slug: 'white' },
];

describe('pickExistingTeam', () => {
	test('keeps the division team when the sheet uses a different capitalization or a Team prefix', () => {
		expect(pickExistingTeam(division, 'RED')?.name).toBe('Team Red');
		expect(pickExistingTeam(division, 'team blue')?.name).toBe('Blue');
		expect(pickExistingTeam(division, 'White')?.name).toBe('WHITE');
	});

	test('does not match a different team', () => {
		expect(pickExistingTeam(division, 'Green')).toBeUndefined();
	});
});

describe('readableTeamName', () => {
	test('turns a fully capitalized name into normal words', () => {
		expect(readableTeamName('GREEN')).toBe('Green');
		expect(readableTeamName('WHITE')).toBe('White');
		expect(readableTeamName('GREEN vs RED')).toBe('Green vs Red');
	});

	test('leaves a name that is not fully capitalized', () => {
		expect(readableTeamName('Team Red')).toBe('Team Red');
		expect(readableTeamName('No Footage')).toBe('No Footage');
	});
});
