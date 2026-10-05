import { and, eq, gt, isNull, or } from 'drizzle-orm';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import {
	LEAGUE_SCALE_SLUG,
	MIN_DIVISION_SAMPLE,
	RATING_VERSION,
	buildRatingScale,
	impactParts,
	isEmptyLine,
	isLaterRatingVersion,
	ratingPatch,
	type ApplicableScale,
	type CountingLine,
	type ImpactParts,
	type RatingScaleDistribution,
} from '$lib/stats/game-rating';
import { isPointsOnlyLine } from '$lib/stats/player-game-stats';

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

type RatingRow = {
	id: string;
	line: CountingLine;
	teamPoints: number | null;
	empty: boolean;
	ratingVersion: string | null;
	organizationId: string;
	divisionSlug: string;
};

const countableLine = or(
	gt(table.playerGameStat.fga, 0),
	gt(table.playerGameStat.fta, 0),
	gt(table.playerGameStat.fgm, 0),
	gt(table.playerGameStat.ftm, 0),
	gt(table.playerGameStat.fg3m, 0),
	gt(table.playerGameStat.oreb, 0),
	gt(table.playerGameStat.dreb, 0),
	gt(table.playerGameStat.ast, 0),
	gt(table.playerGameStat.stl, 0),
	gt(table.playerGameStat.blk, 0),
	gt(table.playerGameStat.tov, 0),
	gt(table.playerGameStat.pf, 0)
);

function organizationStatQuery(organizationId: string) {
	return db
		.select({
			id: table.playerGameStat.id,
			fgm: table.playerGameStat.fgm,
			fga: table.playerGameStat.fga,
			fg3m: table.playerGameStat.fg3m,
			fg3a: table.playerGameStat.fg3a,
			ftm: table.playerGameStat.ftm,
			fta: table.playerGameStat.fta,
			oreb: table.playerGameStat.oreb,
			dreb: table.playerGameStat.dreb,
			ast: table.playerGameStat.ast,
			stl: table.playerGameStat.stl,
			blk: table.playerGameStat.blk,
			tov: table.playerGameStat.tov,
			pf: table.playerGameStat.pf,
			recordedPts: table.playerGameStat.recordedPts,
			ratingVersion: table.playerGameStat.ratingVersion,
			teamId: table.player.teamId,
			divisionSlug: table.division.slug,
			organizationId: table.season.organizationId,
			homeTeamId: table.game.homeTeamId,
			awayTeamId: table.game.awayTeamId,
			homeTeamScore: table.game.homeTeamScore,
			awayTeamScore: table.game.awayTeamScore,
		})
		.from(table.playerGameStat)
		.innerJoin(table.player, eq(table.playerGameStat.playerId, table.player.id))
		.innerJoin(table.team, eq(table.player.teamId, table.team.id))
		.innerJoin(table.division, eq(table.team.divisionId, table.division.id))
		.innerJoin(table.season, eq(table.division.seasonId, table.season.id))
		.innerJoin(table.game, eq(table.playerGameStat.gameId, table.game.id))
		.where(eq(table.season.organizationId, organizationId));
}

async function organizationHasUnratedLines(organizationId: string) {
	const [row] = await db
		.select({ id: table.playerGameStat.id })
		.from(table.playerGameStat)
		.innerJoin(table.player, eq(table.playerGameStat.playerId, table.player.id))
		.innerJoin(table.team, eq(table.player.teamId, table.team.id))
		.innerJoin(table.division, eq(table.team.divisionId, table.division.id))
		.innerJoin(table.season, eq(table.division.seasonId, table.season.id))
		.where(
			and(
				eq(table.season.organizationId, organizationId),
				isNull(table.playerGameStat.gameRating),
				or(
					isNull(table.playerGameStat.ratingVersion),
					eq(table.playerGameStat.ratingVersion, RATING_VERSION)
				),
				countableLine
			)
		)
		.limit(1);
	return row != null;
}

async function organizationHasCurrentScale(organizationId: string) {
	const [row] = await db
		.select({ id: table.gameRatingScale.id })
		.from(table.gameRatingScale)
		.where(
			and(
				eq(table.gameRatingScale.organizationId, organizationId),
				eq(table.gameRatingScale.version, RATING_VERSION)
			)
		)
		.limit(1);
	return row != null;
}

async function upsertScale(input: {
	organizationId: string;
	divisionSlug: string;
	scope: 'division' | 'league';
	sampleSize: number;
	distribution: RatingScaleDistribution;
}) {
	await db
		.insert(table.gameRatingScale)
		.values({
			version: RATING_VERSION,
			organizationId: input.organizationId,
			divisionSlug: input.divisionSlug,
			scope: input.scope,
			sampleSize: input.sampleSize,
			distribution: input.distribution,
		})
		.onConflictDoUpdate({
			target: [
				table.gameRatingScale.organizationId,
				table.gameRatingScale.version,
				table.gameRatingScale.divisionSlug,
			],
			set: {
				scope: input.scope,
				sampleSize: input.sampleSize,
				distribution: input.distribution,
				updatedAt: new Date(),
			},
		});
}

/** Rebuild current-version scales from stored box scores and write a rating on every current player-game. */
export async function recalibrateOrganizationRatings(organizationId: string) {
	const rawRows = await organizationStatQuery(organizationId);
	const pending: RatingRow[] = [];
	const byDivision = new Map<string, ImpactParts[]>();
	const orgSamples: ImpactParts[] = [];

	for (const row of rawRows) {
		const line: CountingLine = {
			fgm: row.fgm,
			fga: row.fga,
			fg3m: row.fg3m,
			fg3a: row.fg3a,
			ftm: row.ftm,
			fta: row.fta,
			oreb: row.oreb,
			dreb: row.dreb,
			ast: row.ast,
			stl: row.stl,
			blk: row.blk,
			tov: row.tov,
			pf: row.pf,
		};
		const teamPoints =
			row.teamId === row.homeTeamId
				? row.homeTeamScore
				: row.teamId === row.awayTeamId
					? row.awayTeamScore
					: null;
		const empty = isEmptyLine(line) || isPointsOnlyLine({ ...line, recordedPts: row.recordedPts });
		pending.push({
			id: row.id,
			line,
			teamPoints,
			empty,
			ratingVersion: row.ratingVersion,
			organizationId: row.organizationId,
			divisionSlug: row.divisionSlug,
		});
		if (empty) continue;
		const parts = impactParts(line);
		const samples = byDivision.get(row.divisionSlug) ?? [];
		samples.push(parts);
		byDivision.set(row.divisionSlug, samples);
		orgSamples.push(parts);
	}

	const league = orgSamples.length > 0 ? buildRatingScale(orgSamples) : null;
	if (league) {
		await upsertScale({
			organizationId,
			divisionSlug: LEAGUE_SCALE_SLUG,
			scope: 'league',
			sampleSize: orgSamples.length,
			distribution: league,
		});
		for (const [divisionSlug, samples] of byDivision) {
			const useDivision = samples.length >= MIN_DIVISION_SAMPLE;
			await upsertScale({
				organizationId,
				divisionSlug,
				scope: useDivision ? 'division' : 'league',
				sampleSize: useDivision ? samples.length : league.impacts.length,
				distribution: useDivision ? buildRatingScale(samples) : league,
			});
		}
	}

	let rated = 0;
	let cleared = 0;
	for (const row of pending) {
		if (row.ratingVersion && isLaterRatingVersion(row.ratingVersion, RATING_VERSION)) continue;
		const samples = byDivision.get(row.divisionSlug);
		const scale: ApplicableScale | null = !league
			? null
			: samples && samples.length >= MIN_DIVISION_SAMPLE
				? { distribution: buildRatingScale(samples), scope: 'division' }
				: { distribution: league, scope: 'league' };
		const patch = ratingPatch(row.line, row.teamPoints, row.empty ? null : scale);
		await db
			.update(table.playerGameStat)
			.set({
				gameRating: patch.gameRating,
				ratingVersion: patch.ratingVersion,
				impactScore: patch.impactScore,
				ratingPercentile: patch.ratingPercentile,
				contextBonus: patch.contextBonus,
				ratingScaleScope: patch.ratingScaleScope,
				ratingBreakdown: patch.ratingBreakdown,
			})
			.where(eq(table.playerGameStat.id, row.id));
		if (patch.gameRating == null) cleared += 1;
		else rated += 1;
	}

	return { rated, cleared };
}

/** Fill missing Game Ratings, and rebuild when this version has no scale yet. */
export async function ensureOrganizationGameRatings(organizationId: string) {
	const needsCurrentScale = !(await organizationHasCurrentScale(organizationId));
	if (!needsCurrentScale && !(await organizationHasUnratedLines(organizationId))) return false;
	await recalibrateOrganizationRatings(organizationId);
	return true;
}

export async function ensureSeasonGameRatings(seasonId: string) {
	const season = await db.query.season.findFirst({
		where: { id: seasonId },
		columns: { organizationId: true },
	});
	if (!season) return false;
	return ensureOrganizationGameRatings(season.organizationId);
}

export async function ensureTeamGameRatings(teamId: string) {
	const team = await db.query.team.findFirst({
		where: { id: teamId },
		columns: { id: true },
		with: { division: { with: { season: { columns: { organizationId: true } } } } },
	});
	const organizationId = team?.division?.season?.organizationId;
	if (!organizationId) return false;
	return ensureOrganizationGameRatings(organizationId);
}

export async function ensurePlayerGameRatings(playerId: string) {
	const player = await db.query.player.findFirst({
		where: { id: playerId },
		columns: { id: true },
		with: {
			team: { with: { division: { with: { season: { columns: { organizationId: true } } } } } },
		},
	});
	const organizationId = player?.team?.division?.season?.organizationId;
	if (!organizationId) return false;
	return ensureOrganizationGameRatings(organizationId);
}

export async function ensureGameBoxRatings(gameId: string) {
	const game = await db.query.game.findFirst({
		where: { id: gameId },
		columns: { seasonId: true },
	});
	if (!game) return false;
	return ensureSeasonGameRatings(game.seasonId);
}
