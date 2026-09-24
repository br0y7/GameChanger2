import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import {
	LEAGUE_SCALE_SLUG,
	RATING_VERSION,
	type ApplicableScale,
} from '$lib/stats/game-rating';

export type { ApplicableScale };
export { LEAGUE_SCALE_SLUG, ratingPatch } from '$lib/stats/game-rating';

export async function loadApplicableScale(
	organizationId: string,
	divisionSlug: string
): Promise<ApplicableScale | null> {
	const rows = await db
		.select({
			divisionSlug: table.gameRatingScale.divisionSlug,
			scope: table.gameRatingScale.scope,
			distribution: table.gameRatingScale.distribution,
		})
		.from(table.gameRatingScale)
		.where(
			and(
				eq(table.gameRatingScale.organizationId, organizationId),
				eq(table.gameRatingScale.version, RATING_VERSION)
			)
		);

	const division = rows.find((row) => row.divisionSlug === divisionSlug);
	if (division && (division.scope === 'division' || division.scope === 'league')) {
		return { distribution: division.distribution, scope: division.scope };
	}

	const league = rows.find((row) => row.divisionSlug === LEAGUE_SCALE_SLUG);
	if (!league || (league.scope !== 'division' && league.scope !== 'league')) return null;
	return { distribution: league.distribution, scope: 'league' };
}
