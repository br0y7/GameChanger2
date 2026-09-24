import { SQL } from 'bun';
import {
	LEAGUE_SCALE_SLUG,
	MIN_DIVISION_SAMPLE,
	RATING_VERSION,
	buildRatingScale,
	impactParts,
	isEmptyLine,
	ratingPatch,
	type ApplicableScale,
	type CountingLine,
	type ImpactParts,
	type RatingScaleDistribution,
} from '../src/lib/stats/game-rating.ts';

if (!process.env.DATABASE_URL) {
	console.error('[ERROR] DATABASE_URL is not set.');
	process.exit(1);
}

const db = new SQL(process.env.DATABASE_URL);

type Row = {
	id: string;
	fgm: number;
	fga: number;
	fg3m: number;
	fg3a: number;
	ftm: number;
	fta: number;
	oreb: number;
	dreb: number;
	ast: number;
	stl: number;
	blk: number;
	tov: number;
	pf: number;
	recorded_pts: number | null;
	rating_version: string | null;
	team_id: string;
	division_slug: string;
	organization_id: string;
	home_team_id: string;
	away_team_id: string;
	home_team_score: number | null;
	away_team_score: number | null;
};

type ScaleGroup = {
	organizationId: string;
	divisionSlug: string;
	samples: ImpactParts[];
};

const rows = await db<Row[]>`
	select
		pgs.id,
		pgs.fgm, pgs.fga, pgs.fg3m, pgs.fg3a, pgs.ftm, pgs.fta,
		pgs.oreb, pgs.dreb, pgs.ast, pgs.stl, pgs.blk, pgs.tov, pgs.pf,
		pgs.recorded_pts,
		pgs.rating_version,
		p.team_id,
		d.slug as division_slug,
		s.organization_id,
		g.home_team_id,
		g.away_team_id,
		g.home_team_score,
		g.away_team_score
	from player_game_stat pgs
	join player p on p.id = pgs.player_id
	join team t on t.id = p.team_id
	join division d on d.id = t.division_id
	join season s on s.id = d.season_id
	join game g on g.id = pgs.game_id
`;

const byDivision = new Map<string, ScaleGroup>();
const byOrganization = new Map<string, ImpactParts[]>();

type Pending = {
	id: string;
	organizationId: string;
	divisionSlug: string;
	line: CountingLine;
	teamPoints: number | null;
	empty: boolean;
	ratingVersion: string | null;
};

const pending: Pending[] = [];

for (const row of rows) {
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
		row.team_id === row.home_team_id
			? row.home_team_score
			: row.team_id === row.away_team_id
				? row.away_team_score
				: null;

	pending.push({
		id: row.id,
		organizationId: row.organization_id,
		divisionSlug: row.division_slug,
		line,
		teamPoints,
		empty: isEmptyLine(line) || row.recorded_pts != null,
		ratingVersion: row.rating_version,
	});

	if (isEmptyLine(line) || row.recorded_pts != null) continue;
	const parts = impactParts(line);
	const key = `${row.organization_id}::${row.division_slug}`;
	const group = byDivision.get(key) ?? {
		organizationId: row.organization_id,
		divisionSlug: row.division_slug,
		samples: [],
	};
	group.samples.push(parts);
	byDivision.set(key, group);
	const orgSamples = byOrganization.get(row.organization_id) ?? [];
	orgSamples.push(parts);
	byOrganization.set(row.organization_id, orgSamples);
}

async function upsertScale(input: {
	organizationId: string;
	divisionSlug: string;
	scope: 'division' | 'league';
	sampleSize: number;
	distribution: RatingScaleDistribution;
}) {
	await db`
		insert into game_rating_scale (
			id, created_at, updated_at, version, organization_id, division_slug, scope, sample_size, distribution
		) values (
			uuidv7(), now(), now(), ${RATING_VERSION}, ${input.organizationId}::uuid, ${input.divisionSlug},
			${input.scope}, ${input.sampleSize}, ${JSON.stringify(input.distribution)}::jsonb
		)
		on conflict (organization_id, version, division_slug)
		do update set
			scope = excluded.scope,
			sample_size = excluded.sample_size,
			distribution = excluded.distribution,
			updated_at = now()
	`;
}

const leagueScales = new Map<string, RatingScaleDistribution>();
let scalesWritten = 0;

for (const [organizationId, samples] of byOrganization) {
	if (samples.length === 0) continue;
	const distribution = buildRatingScale(samples);
	leagueScales.set(organizationId, distribution);
	await upsertScale({
		organizationId,
		divisionSlug: LEAGUE_SCALE_SLUG,
		scope: 'league',
		sampleSize: samples.length,
		distribution,
	});
	scalesWritten += 1;
}

for (const group of byDivision.values()) {
	const league = leagueScales.get(group.organizationId);
	if (!league) continue;
	const useDivision = group.samples.length >= MIN_DIVISION_SAMPLE;
	await upsertScale({
		organizationId: group.organizationId,
		divisionSlug: group.divisionSlug,
		scope: useDivision ? 'division' : 'league',
		sampleSize: useDivision ? group.samples.length : league.impacts.length,
		distribution: useDivision ? buildRatingScale(group.samples) : league,
	});
	scalesWritten += 1;
}

let rated = 0;
let cleared = 0;
let skipped = 0;

for (const row of pending) {
	if (row.ratingVersion && row.ratingVersion !== RATING_VERSION) {
		skipped += 1;
		continue;
	}

	const league = leagueScales.get(row.organizationId) ?? null;
	const group = byDivision.get(`${row.organizationId}::${row.divisionSlug}`);
	const scale: ApplicableScale | null = !league
		? null
		: group && group.samples.length >= MIN_DIVISION_SAMPLE
			? { distribution: buildRatingScale(group.samples), scope: 'division' }
			: { distribution: league, scope: 'league' };

	const patch = ratingPatch(row.line, row.teamPoints, row.empty ? null : scale);
	await db`
		update player_game_stat
		set
			game_rating = ${patch.gameRating},
			rating_version = ${patch.ratingVersion},
			impact_score = ${patch.impactScore},
			rating_percentile = ${patch.ratingPercentile},
			context_bonus = ${patch.contextBonus},
			rating_scale_scope = ${patch.ratingScaleScope},
			rating_breakdown = ${patch.ratingBreakdown ? JSON.stringify(patch.ratingBreakdown) : null}::jsonb,
			updated_at = now()
		where id = ${row.id}::uuid
			and (rating_version is null or rating_version = ${RATING_VERSION})
	`;

	if (patch.gameRating == null) cleared += 1;
	else rated += 1;
}

console.log(
	`[INFO] GC-v1 scales written: ${scalesWritten}. Rated ${rated} player-games, cleared ${cleared}, left ${skipped} on a later rating version (${pending.length} considered).`
);

await db.close();
