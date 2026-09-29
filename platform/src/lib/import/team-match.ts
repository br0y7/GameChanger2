import { slugify } from '$lib/utils/string';

/** "00" and "04" are jersey numbers stored as text, not team names. */
export function isJerseyNumberTeamName(name: string): boolean {
	return /^\d+$/.test(name.trim());
}

/** "GREEN" and "WHITE" become "Green" and "White". Mixed-case names stay as written. */
export function readableTeamName(name: string): string {
	return name
		.trim()
		.replace(/\s+/g, ' ')
		.split(' ')
		.map((word) => {
			if (word.length > 1 && word === word.toUpperCase() && /[A-Z]/.test(word)) {
				return word.charAt(0) + word.slice(1).toLowerCase();
			}
			return word;
		})
		.join(' ');
}

/** "Team Red", "RED", and "Red" are the same team. */
export function teamMatchKey(name: string): string {
	return name
		.trim()
		.toLowerCase()
		.replace(/^team\s+/, '')
		.replace(/[^a-z0-9]+/g, '');
}

export function pickExistingTeam<T extends { name: string; slug?: string | null }>(
	teams: T[],
	name: string
): T | undefined {
	const trimmed = name.trim().toLowerCase();
	const exact = teams.find((team) => team.name.trim().toLowerCase() === trimmed);
	if (exact) return exact;

	const key = teamMatchKey(name);
	if (!key) return undefined;

	const matches = teams.filter((team) => teamMatchKey(team.name) === key);
	if (matches.length === 0) return undefined;
	if (matches.length === 1) return matches[0];

	const slug = slugify(name);
	return (
		matches.find((team) => team.slug === slug) ??
		[...matches].sort((a, b) => a.name.length - b.name.length)[0]
	);
}
