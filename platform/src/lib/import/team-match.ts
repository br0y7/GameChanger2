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

const COLOR_PLURALS: Record<string, string> = {
	reds: 'red',
	whites: 'white',
	blacks: 'black',
	blues: 'blue',
	greens: 'green',
	yellows: 'yellow',
	oranges: 'orange',
	purples: 'purple',
	pinks: 'pink',
	browns: 'brown',
	golds: 'gold',
	greys: 'grey',
	grays: 'gray',
};

/**
 * "Team Red", "Team Reds", "RED", and "Red" are the same team.
 * "Team 5" is not jersey "5" — that leftover sheet row must not fold into Dads Team 5.
 */
export function teamMatchKey(name: string): string {
	const trimmed = name.trim().toLowerCase();
	const withoutPrefix = trimmed.replace(/^team\s+/, '');
	if (/^\d+$/.test(withoutPrefix) && /^team\s+/.test(trimmed)) {
		return trimmed.replace(/[^a-z0-9]+/g, '');
	}
	const key = withoutPrefix.replace(/[^a-z0-9]+/g, '');
	return COLOR_PLURALS[key] ?? key;
}

/** Keep "Red" over "Team Reds" when folding duplicate rows. Never prefer jersey "5" over "Team 5". */
export function preferredTeamName(names: string[]): string {
	const named = names.filter((name) => !isJerseyNumberTeamName(name));
	const source = named.length ? named : names;
	const withoutPrefix = source.filter((name) => !/^team\s+/i.test(name.trim()));
	const pool = withoutPrefix.length ? withoutPrefix : source;
	const shortest = [...pool].sort((a, b) => a.length - b.length)[0] ?? names[0] ?? '';
	return readableTeamName(shortest);
}

export function pickExistingTeam<T extends { name: string; slug?: string | null }>(
	teams: T[],
	name: string
): T | undefined {
	const trimmed = name.trim().toLowerCase();
	const exact = teams.find((team) => team.name.trim().toLowerCase() === trimmed);
	if (exact) return exact;

	if (isJerseyNumberTeamName(name)) return undefined;

	const key = teamMatchKey(name);
	if (!key) return undefined;

	const matches = teams.filter(
		(team) => !isJerseyNumberTeamName(team.name) && teamMatchKey(team.name) === key
	);
	if (matches.length === 0) return undefined;
	if (matches.length === 1) return matches[0];

	const slug = slugify(name);
	return (
		matches.find((team) => team.slug === slug) ??
		[...matches].sort((a, b) => a.name.length - b.name.length)[0]
	);
}
