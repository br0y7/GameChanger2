import { describe, expect, test } from 'bun:test';
import {
	isJerseyNumberTeamName,
	pickExistingTeam,
	preferredTeamName,
	readableTeamName,
	teamMatchKey,
} from './team-match';

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

	test('does not treat jersey 5 as Dads Team 5', () => {
		const dads = [
			{ name: 'Team 1', slug: 'team-1' },
			{ name: 'Team 5', slug: 'team-5' },
		];
		expect(teamMatchKey('Team 5')).not.toBe(teamMatchKey('5'));
		expect(pickExistingTeam(dads, '5')).toBeUndefined();
		expect(pickExistingTeam(dads, 'Team 5')?.name).toBe('Team 5');
	});

	test('treats Team Reds as the same team as Red', () => {
		expect(teamMatchKey('Team Reds')).toBe(teamMatchKey('Red'));
		expect(teamMatchKey('Team Whites')).toBe(teamMatchKey('White'));
		expect(teamMatchKey('Team Blacks')).toBe(teamMatchKey('Black'));
		expect(pickExistingTeam(division, 'Team Reds')?.name).toBe('Team Red');
	});
});

describe('preferredTeamName', () => {
	test('keeps the color name instead of the Team prefix', () => {
		expect(preferredTeamName(['Team Reds', 'Red'])).toBe('Red');
		expect(preferredTeamName(['Team White', 'WHITE'])).toBe('White');
	});

	test('keeps Team 5 instead of jersey 5', () => {
		expect(preferredTeamName(['Team 5', '5'])).toBe('Team 5');
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

describe('isJerseyNumberTeamName', () => {
	test('treats a column of only digits as a jersey, including a leading zero', () => {
		expect(isJerseyNumberTeamName('00')).toBe(true);
		expect(isJerseyNumberTeamName('04')).toBe(true);
		expect(isJerseyNumberTeamName(' 7 ')).toBe(true);
	});

	test('leaves a real team name alone', () => {
		expect(isJerseyNumberTeamName('Green')).toBe(false);
		expect(isJerseyNumberTeamName('U10')).toBe(false);
		expect(isJerseyNumberTeamName('10U')).toBe(false);
	});
});
