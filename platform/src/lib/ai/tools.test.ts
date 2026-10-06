import { describe, expect, test } from 'bun:test';
import { matchesSearch, normalizeSearch } from './tools';

describe('matchesSearch', () => {
	test('matches a name or jersey without needing an exact string', () => {
		expect(matchesSearch('Maya Chen', 'maya')).toBe(true);
		expect(matchesSearch('12', '#12')).toBe(true);
		expect(matchesSearch('Red', 'u12 red')).toBe(true);
		expect(matchesSearch('White', 'black')).toBe(false);
		expect(normalizeSearch('#04')).toBe('04');
	});
});
