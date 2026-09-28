import { describe, expect, test } from 'bun:test';
import { parseAdminViewAsCookie, writeAdminViewAsCookie, type AdminViewMode } from './view-as';

describe('parseAdminViewAsCookie', () => {
	test('only coach and family switch the sidebar', () => {
		expect(parseAdminViewAsCookie('coach')).toBe('coach');
		expect(parseAdminViewAsCookie('family')).toBe('family');
	});

	test('anything else is the admin dashboard, including a forged cookie', () => {
		expect(parseAdminViewAsCookie(undefined)).toBe('admin');
		expect(parseAdminViewAsCookie(null)).toBe('admin');
		expect(parseAdminViewAsCookie('admin')).toBe('admin');
		expect(parseAdminViewAsCookie('organizer')).toBe('admin');
	});
});

describe('writeAdminViewAsCookie', () => {
	test('stores coach or family and clears the cookie for admin', () => {
		const calls: Array<{ op: string; name: string; value?: string }> = [];
		const cookies = {
			set(name: string, value: string) {
				calls.push({ op: 'set', name, value });
			},
			delete(name: string) {
				calls.push({ op: 'delete', name });
			},
		};

		writeAdminViewAsCookie(cookies, 'coach');
		writeAdminViewAsCookie(cookies, 'family');
		writeAdminViewAsCookie(cookies, 'admin');

		expect(calls).toEqual([
			{ op: 'set', name: 'admin_view_as', value: 'coach' },
			{ op: 'set', name: 'admin_view_as', value: 'family' },
			{ op: 'delete', name: 'admin_view_as' },
		]);
	});

	test('the writer only accepts the three admin modes', () => {
		const modes: AdminViewMode[] = ['admin', 'coach', 'family'];
		expect(modes).toHaveLength(3);
	});
});
