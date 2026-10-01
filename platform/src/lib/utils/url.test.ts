import { describe, expect, test } from 'bun:test';
import { shouldHonorPreferredRedirect } from './url';

describe('shouldHonorPreferredRedirect', () => {
	test('sends Home Dashboard through role landing, not a leftover /dashboard bounce', () => {
		expect(shouldHonorPreferredRedirect(null)).toBe(false);
		expect(shouldHonorPreferredRedirect(undefined)).toBe(false);
		expect(shouldHonorPreferredRedirect('/dashboard')).toBe(false);
		expect(shouldHonorPreferredRedirect('/dashboard/')).toBe(false);
	});

	test('keeps invite links and deep dashboard links from a login', () => {
		expect(shouldHonorPreferredRedirect('/invite/coach/abc')).toBe(true);
		expect(shouldHonorPreferredRedirect('/dashboard/wpg/portal')).toBe(true);
		expect(shouldHonorPreferredRedirect('/dashboard/wpg/seasons/s8/games/g1')).toBe(true);
	});

	test('ignores paths outside dashboard and invites', () => {
		expect(shouldHonorPreferredRedirect('/login')).toBe(false);
		expect(shouldHonorPreferredRedirect('https://evil.example/dashboard')).toBe(false);
	});
});
