import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { serverLogger } from '$lib/server/logger';
import { inArray } from 'drizzle-orm';
import { isJerseyNumberTeamName } from './team-match';

/** Drop teams that were created from a jersey number row ("00", "04") in a statsheet. */
export async function purgeJerseyNumberTeams(divisionId: string) {
	const teams = await db.query.team.findMany({
		where: { divisionId },
		columns: { id: true, name: true },
	});
	const bogus = teams.filter((team) => isJerseyNumberTeamName(team.name));
	if (bogus.length === 0) return 0;

	await db.delete(table.team).where(
		inArray(
			table.team.id,
			bogus.map((team) => team.id)
		)
	);
	serverLogger.info('removed teams named after jersey numbers', {
		divisionId,
		names: bogus.map((team) => team.name),
	});
	return bogus.length;
}

export async function purgeJerseyNumberTeamsForSeason(seasonId: string) {
	const divisions = await db.query.division.findMany({
		where: { seasonId },
		columns: { id: true },
	});
	let removed = 0;
	for (const division of divisions) {
		removed += await purgeJerseyNumberTeams(division.id);
	}
	return removed;
}
