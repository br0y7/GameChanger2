export type MessageBlock =
	| { type: 'paragraph'; text: string }
	| { type: 'list'; items: string[] };

const BULLET = /^(?:[-*•]|\d+[.)])\s+(.+)$/;

/** Split chat text into paragraphs, then group bullet lines into one list. */
export function messageBlocks(content: string): MessageBlock[] {
	const lines = messageParagraphs(content).flatMap((paragraph) =>
		paragraph
			.split('\n')
			.map((line) => line.trim())
			.filter(Boolean)
	);
	const blocks: MessageBlock[] = [];
	let items: string[] | null = null;

	for (const line of lines) {
		const match = line.match(BULLET);
		if (match) {
			if (!items) {
				items = [];
				blocks.push({ type: 'list', items });
			}
			items.push(match[1]);
			continue;
		}
		items = null;
		blocks.push({ type: 'paragraph', text: line });
	}

	return blocks;
}

/** Split assistant text into readable chunks. */
function messageParagraphs(content: string): string[] {
	const trimmed = content.trim();
	if (!trimmed) return [];

	const byBlankLine = trimmed
		.split(/\n\s*\n/)
		.map((p) => p.trim())
		.filter(Boolean);

	if (byBlankLine.length > 1) return byBlankLine;

	const byLine = trimmed
		.split('\n')
		.map((p) => p.trim())
		.filter(Boolean);
	if (byLine.length > 1) return byLine;

	if (trimmed.length > 280) {
		const sentences = trimmed.match(/[^.!?]+[.!?]+(?:\s+|$)|[^.!?]+$/g) ?? [trimmed];
		const chunks: string[] = [];
		let current = '';
		for (const sentence of sentences) {
			const next = (current ? `${current} ${sentence.trim()}` : sentence.trim()).trim();
			if (current && next.length > 220) {
				chunks.push(current);
				current = sentence.trim();
			} else {
				current = next;
			}
		}
		if (current) chunks.push(current);
		if (chunks.length > 1) return chunks;
	}

	return [trimmed];
}
