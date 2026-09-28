import { describe, expect, test } from 'bun:test';
import { messageBlocks } from './message-blocks';

describe('messageBlocks', () => {
	test('groups a number list into one bullet block', () => {
		const blocks = messageBlocks(`Strong game overall. Your biggest impact was scoring and rebounding.

- 30 points

- 26 rebounds, including 11 offensive rebounds

The main area to clean up was the 8 turnovers.`);

		expect(blocks).toEqual([
			{
				type: 'paragraph',
				text: 'Strong game overall. Your biggest impact was scoring and rebounding.',
			},
			{
				type: 'list',
				items: ['30 points', '26 rebounds, including 11 offensive rebounds'],
			},
			{ type: 'paragraph', text: 'The main area to clean up was the 8 turnovers.' },
		]);
	});

	test('groups bullets that share one block after the answer', () => {
		const blocks = messageBlocks(`Here is the regular-season order.

- #1 Red 5-3
- #3 Blue 1-7`);

		expect(blocks[1]).toEqual({
			type: 'list',
			items: ['#1 Red 5-3', '#3 Blue 1-7'],
		});
	});

	test('keeps a sentence with one number as a paragraph', () => {
		expect(messageBlocks("You're averaging 6.4 rebounds per game.")).toEqual([
			{ type: 'paragraph', text: "You're averaging 6.4 rebounds per game." },
		]);
	});
});
