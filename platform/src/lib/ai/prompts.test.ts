import { describe, expect, test } from 'bun:test';
import { websiteHelpFor } from './prompts';

describe('websiteHelpFor', () => {
	test('keeps import and roster edits off player and family help', () => {
		const family = websiteHelpFor('player');
		expect(family).toContain('Schedule');
		expect(family).not.toContain('Import');
		expect(family).not.toContain('Invite');
		expect(family).not.toContain('admin');
		expect(family).not.toContain('Coach notes');
	});

	test('keeps import off the coach guide and on the organizer guide', () => {
		expect(websiteHelpFor('coach')).toContain('Coach notes');
		expect(websiteHelpFor('coach')).not.toContain('Import');
		expect(websiteHelpFor('organizer')).toContain('Import');
		expect(websiteHelpFor('organizer')).not.toContain('admin/import');
	});
});
