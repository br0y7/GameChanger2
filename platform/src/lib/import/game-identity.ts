import { Temporal } from 'temporal-polyfill';

export function calendarDay(value: Date | string | null | undefined, timeZone?: string): string {
	if (value == null || value === '') return '';
	const date = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(date.getTime())) return '';

	const zone = timeZone?.trim() || 'UTC';
	try {
		return Temporal.Instant.fromEpochMilliseconds(date.getTime())
			.toZonedDateTimeISO(zone)
			.toPlainDate()
			.toString();
	} catch {
		return Temporal.Instant.fromEpochMilliseconds(date.getTime())
			.toZonedDateTimeISO('UTC')
			.toPlainDate()
			.toString();
	}
}

type ImportGame = {
	playedOn?: string | null;
	completedAt?: Date | string | null;
	homeTeam: { name: string };
	awayTeam: { name: string };
};

/** Same teams on the same day are one game. A later file in the same preview can add games. */
export function importGameKey(game: ImportGame, timeZone?: string): string {
	const day = game.playedOn?.trim() || calendarDay(game.completedAt, timeZone);
	const home = game.homeTeam.name.trim().toLowerCase();
	const away = game.awayTeam.name.trim().toLowerCase();
	return `${day}|${home}|${away}`;
}

export function mergeImportedGames<T extends ImportGame>(
	existing: T[],
	incoming: T[],
	timeZone?: string
): T[] {
	const incomingKeys = new Set(incoming.map((game) => importGameKey(game, timeZone)));
	const kept = existing.filter((game) => !incomingKeys.has(importGameKey(game, timeZone)));
	return [...kept, ...incoming];
}

/** Games already stored for this division that the new statsheet does not include. */
export function staleDivisionGameIds(
	games: { id: string; homeTeamId: string; awayTeamId: string }[],
	divisionTeamIds: ReadonlySet<string>,
	keptGameIds: ReadonlySet<string>
) {
	return games
		.filter(
			(game) =>
				divisionTeamIds.has(game.homeTeamId) &&
				divisionTeamIds.has(game.awayTeamId) &&
				!keptGameIds.has(game.id)
		)
		.map((game) => game.id);
}
