/** Official GameChanger Rating. GC-v2 uses a Game Score–style impact. */
export const RATING_VERSION = 'GC-v2' as const;

/** Division scales thinner than this fall back to the league-wide scale. */
export const MIN_DIVISION_SAMPLE = 40;

/** Empty division slug stores the league-wide fallback scale. */
export const LEAGUE_SCALE_SLUG = '';

/** Game rating vs season average: at least this far counts as up or down. */
export const TREND_DELTA = 0.3;

export type RatingVersion = typeof RATING_VERSION;

/** True when a stored row is on a newer formula than the one being written. */
export function isLaterRatingVersion(stored: string, current: string) {
	return stored !== current && stored.localeCompare(current, undefined, { numeric: true }) > 0;
}

export type CountingLine = {
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
};

export type ImpactLabel =
	'Exceptional' | 'Very High' | 'High' | 'Moderate' | 'Average' | 'Low' | 'Poor';

export type RatingBreakdown = {
	scoring: ImpactLabel;
	rebounding: ImpactLabel;
	playmaking: ImpactLabel;
	defence: ImpactLabel;
	efficiency: ImpactLabel | null;
	ballSecurity: ImpactLabel;
	gameContext: ImpactLabel | null;
};

export type RatingScaleDistribution = {
	impacts: number[];
	scoring: number[];
	rebounding: number[];
	playmaking: number[];
	defence: number[];
	efficiency: number[];
	turnovers: number[];
};

export type ImpactParts = {
	points: number;
	rebounds: number;
	offensiveRebounds: number;
	defensiveRebounds: number;
	impact: number;
	scoring: number;
	rebounding: number;
	playmaking: number;
	defence: number;
	/** Field-goal percentage when there are at least two attempts. */
	efficiency: number | null;
	turnovers: number;
};

export type ComputedGameRating = {
	rating: number;
	ratingVersion: RatingVersion;
	impactScore: number;
	percentile: number;
	contextBonus: number;
	meaning: string;
	breakdown: RatingBreakdown;
};

type RatingBand = {
	min: number;
	max: number;
	ratingMin: number;
	ratingMax: number;
};

/** Percentile of player-games → rating. A 10 is reserved for the top 0.5%. */
const RATING_BANDS: RatingBand[] = [
	{ min: 0, max: 10, ratingMin: 3.0, ratingMax: 4.8 },
	{ min: 10, max: 25, ratingMin: 4.8, ratingMax: 5.8 },
	{ min: 25, max: 50, ratingMin: 5.8, ratingMax: 7.0 },
	{ min: 50, max: 75, ratingMin: 7.0, ratingMax: 7.8 },
	{ min: 75, max: 90, ratingMin: 7.8, ratingMax: 8.6 },
	{ min: 90, max: 97, ratingMin: 8.6, ratingMax: 9.3 },
	{ min: 97, max: 99.5, ratingMin: 9.3, ratingMax: 9.8 },
	{ min: 99.5, max: 100, ratingMin: 9.8, ratingMax: 10.0 },
];

const LABEL_RANK: Record<ImpactLabel, number> = {
	Poor: 0,
	Low: 1,
	Average: 2,
	Moderate: 3,
	High: 4,
	'Very High': 5,
	Exceptional: 6,
};

export function pointsFromLine(line: CountingLine) {
	return (line.fgm - line.fg3m) * 2 + line.fg3m * 3 + line.ftm;
}

/** A blank box line is not a performance. Minutes are ignored; imports often leave them at 0. */
export function isEmptyLine(line: CountingLine) {
	const points = pointsFromLine(line);
	return (
		points === 0 &&
		line.oreb === 0 &&
		line.dreb === 0 &&
		line.ast === 0 &&
		line.stl === 0 &&
		line.blk === 0 &&
		line.tov === 0 &&
		line.pf === 0 &&
		line.fga === 0 &&
		line.fta === 0
	);
}

export function impactParts(line: CountingLine): ImpactParts {
	const points = pointsFromLine(line);
	const missedFreeThrows = Math.max(0, line.fta - line.ftm);
	const rebounding = line.oreb * 0.7 + line.dreb * 0.3;
	const playmaking = line.ast * 0.7;
	const defence = line.stl * 1.0 + line.blk * 0.7;
	const impact =
		points +
		line.fgm * 0.4 -
		line.fga * 0.7 -
		missedFreeThrows * 0.4 +
		rebounding +
		playmaking +
		defence -
		line.tov * 1.0 -
		line.pf * 0.4;

	return {
		points,
		rebounds: line.oreb + line.dreb,
		offensiveRebounds: line.oreb,
		defensiveRebounds: line.dreb,
		impact,
		scoring: points,
		rebounding,
		playmaking,
		defence,
		efficiency: line.fga >= 2 ? line.fgm / line.fga : null,
		turnovers: line.tov,
	};
}

/** Stored for explanation of scoring share. Not added to the official rating. */
export function scoringContextBonus(points: number, teamPoints: number | null | undefined) {
	if (teamPoints == null || teamPoints <= 0) return 0;
	const share = points / teamPoints;
	if (share <= 0.4) return 0;
	return Math.min(0.4, (share - 0.4) * 0.8);
}

/**
 * Midrank percentile in 0–100 against a sorted ascending reference.
 * Tied values share one percentile. A value absent from the scale uses the
 * share of reference values strictly below it.
 */
export function percentileRank(sortedAscending: number[], value: number) {
	const n = sortedAscending.length;
	if (n === 0) return 0;

	let low = 0;
	let high = n;
	while (low < high) {
		const mid = (low + high) >> 1;
		if (sortedAscending[mid] < value) low = mid + 1;
		else high = mid;
	}
	const below = low;

	low = below;
	high = n;
	while (low < high) {
		const mid = (low + high) >> 1;
		if (sortedAscending[mid] <= value) low = mid + 1;
		else high = mid;
	}
	const equal = low - below;
	return ((below + 0.5 * equal) / n) * 100;
}

export function baseRatingFromPercentile(percentile: number) {
	const p = Math.min(100, Math.max(0, percentile));
	for (let i = 0; i < RATING_BANDS.length; i++) {
		const band = RATING_BANDS[i];
		const isLast = i === RATING_BANDS.length - 1;
		if (p <= band.max || isLast) {
			const span = band.max - band.min;
			const t = span === 0 ? 1 : (p - band.min) / span;
			return band.ratingMin + t * (band.ratingMax - band.ratingMin);
		}
	}
	return 3.0;
}

export function ratingMeaning(rating: number) {
	if (rating >= 9.5) return 'Exceptional';
	if (rating >= 9.0) return 'Outstanding';
	if (rating >= 8.0) return 'Excellent';
	if (rating >= 7.0) return 'Strong';
	if (rating >= 6.0) return 'Solid';
	if (rating >= 5.0) return 'Developing';
	return 'Limited impact';
}

export function labelFromPercentile(percentile: number): ImpactLabel {
	if (percentile >= 97) return 'Exceptional';
	if (percentile >= 90) return 'Very High';
	if (percentile >= 75) return 'High';
	if (percentile >= 50) return 'Moderate';
	if (percentile >= 25) return 'Average';
	if (percentile >= 10) return 'Low';
	return 'Poor';
}

export function gameContextLabel(points: number, teamPoints: number | null | undefined) {
	if (teamPoints == null || teamPoints <= 0) return null;
	const share = points / teamPoints;
	if (share >= 0.7) return 'Exceptional';
	if (share >= 0.5) return 'Very High';
	if (share >= 0.4) return 'High';
	if (share >= 0.25) return 'Moderate';
	if (share >= 0.15) return 'Average';
	if (share > 0) return 'Low';
	return 'Poor';
}

export function buildRatingScale(samples: ImpactParts[]): RatingScaleDistribution {
	const impacts: number[] = [];
	const scoring: number[] = [];
	const rebounding: number[] = [];
	const playmaking: number[] = [];
	const defence: number[] = [];
	const efficiency: number[] = [];
	const turnovers: number[] = [];

	for (const sample of samples) {
		impacts.push(sample.impact);
		scoring.push(sample.scoring);
		rebounding.push(sample.rebounding);
		playmaking.push(sample.playmaking);
		defence.push(sample.defence);
		turnovers.push(sample.turnovers);
		if (sample.efficiency != null) efficiency.push(sample.efficiency);
	}

	const asc = (values: number[]) => values.sort((a, b) => a - b);
	return {
		impacts: asc(impacts),
		scoring: asc(scoring),
		rebounding: asc(rebounding),
		playmaking: asc(playmaking),
		defence: asc(defence),
		efficiency: asc(efficiency),
		turnovers: asc(turnovers),
	};
}

function roundTo(value: number, places: number) {
	const factor = 10 ** places;
	return Math.round(value * factor) / factor;
}

export function roundRating(value: number) {
	return roundTo(Math.min(10, Math.max(3, value)), 1);
}

export type ApplicableScale = {
	distribution: RatingScaleDistribution;
	scope: 'division' | 'league';
};

export function clearedRating() {
	return {
		gameRating: null,
		ratingVersion: null,
		impactScore: null,
		ratingPercentile: null,
		contextBonus: null,
		ratingScaleScope: null,
		ratingBreakdown: null,
	};
}

/** Columns to store with a player-game. Null when the line is empty or no scale exists. */
export function ratingPatch(
	line: CountingLine,
	teamPoints: number | null | undefined,
	scale: ApplicableScale | null
) {
	if (!scale?.distribution?.impacts?.length) return clearedRating();
	const computed = computeGameRating({
		line,
		teamPoints,
		scale: scale.distribution,
	});
	if (!computed) return clearedRating();
	return {
		gameRating: computed.rating,
		ratingVersion: computed.ratingVersion,
		impactScore: computed.impactScore,
		ratingPercentile: computed.percentile,
		contextBonus: computed.contextBonus,
		ratingScaleScope: scale.scope,
		ratingBreakdown: computed.breakdown,
	};
}

export function computeGameRating(input: {
	line: CountingLine;
	teamPoints: number | null | undefined;
	scale: RatingScaleDistribution;
}): ComputedGameRating | null {
	if (isEmptyLine(input.line)) return null;
	if (!input.scale?.impacts?.length) return null;

	const parts = impactParts(input.line);
	const percentile = percentileRank(input.scale.impacts, parts.impact);
	const rating = roundRating(baseRatingFromPercentile(percentile));

	const turnoverPercentile = percentileRank(input.scale.turnovers, parts.turnovers);
	const ballSecurity = labelFromPercentile(Math.min(100, Math.max(0, 100 - turnoverPercentile)));

	const breakdown: RatingBreakdown = {
		scoring: labelFromPercentile(percentileRank(input.scale.scoring, parts.scoring)),
		rebounding: labelFromPercentile(percentileRank(input.scale.rebounding, parts.rebounding)),
		playmaking: labelFromPercentile(percentileRank(input.scale.playmaking, parts.playmaking)),
		defence: labelFromPercentile(percentileRank(input.scale.defence, parts.defence)),
		efficiency:
			parts.efficiency == null || input.scale.efficiency.length === 0
				? null
				: labelFromPercentile(percentileRank(input.scale.efficiency, parts.efficiency)),
		ballSecurity,
		gameContext: gameContextLabel(parts.points, input.teamPoints),
	};

	return {
		rating,
		ratingVersion: RATING_VERSION,
		impactScore: roundTo(parts.impact, 2),
		percentile: roundTo(percentile, 2),
		contextBonus: 0,
		meaning: ratingMeaning(rating),
		breakdown,
	};
}

export const BREAKDOWN_BAR_FIELDS = [
	{ key: 'scoring', label: 'Scoring' },
	{ key: 'efficiency', label: 'Efficiency' },
	{ key: 'rebounding', label: 'Rebounding' },
	{ key: 'playmaking', label: 'Playmaking' },
	{ key: 'defence', label: 'Defence' },
	{ key: 'ballSecurity', label: 'Ball security' },
] as const satisfies ReadonlyArray<{ key: keyof RatingBreakdown; label: string }>;

const BREAKDOWN_FIELDS = [
	...BREAKDOWN_BAR_FIELDS,
	{ key: 'gameContext', label: 'Game context' },
] as const satisfies ReadonlyArray<{ key: keyof RatingBreakdown; label: string }>;

export function breakdownBarWidth(label: ImpactLabel) {
	return ((LABEL_RANK[label] + 1) / 7) * 100;
}

export function strongestCategory(breakdown: RatingBreakdown) {
	let best: { key: keyof RatingBreakdown; label: string; rank: number } | null = null;
	for (const field of BREAKDOWN_FIELDS) {
		if (field.key === 'gameContext') continue;
		const value = breakdown[field.key];
		if (value == null) continue;
		const rank = LABEL_RANK[value];
		if (!best || rank > best.rank) best = { key: field.key, label: field.label, rank };
	}
	return best;
}

export function developmentFocus(breakdown: RatingBreakdown) {
	let worst: { key: keyof RatingBreakdown; label: string; rank: number } | null = null;
	for (const field of BREAKDOWN_FIELDS) {
		if (field.key === 'gameContext') continue;
		const value = breakdown[field.key];
		if (value == null) continue;
		const rank = LABEL_RANK[value];
		if (!worst || rank < worst.rank) worst = { key: field.key, label: field.label, rank };
	}
	return worst;
}

export function averageGameRating(ratings: number[]) {
	if (ratings.length === 0) return null;
	const total = ratings.reduce((sum, rating) => sum + rating, 0);
	return roundTo(total / ratings.length, 1);
}

export type RatingTrend = 'up' | 'flat' | 'down';

export function trendVersusAverage(gameRating: number, seasonAverage: number | null): RatingTrend {
	if (seasonAverage == null) return 'flat';
	const delta = roundTo(gameRating - seasonAverage, 1);
	if (delta >= TREND_DELTA) return 'up';
	if (delta <= -TREND_DELTA) return 'down';
	return 'flat';
}

export function trendDelta(gameRating: number, seasonAverage: number | null) {
	if (seasonAverage == null) return null;
	return roundTo(gameRating - seasonAverage, 1);
}

export function formatOfficialRatingBlock(input: {
	playerName: string;
	rating: number;
	meaning: string;
	impactScore: number;
	percentile: number;
	contextBonus: number;
	breakdown: RatingBreakdown;
	points: number;
	rebounds: number;
	offensiveRebounds: number;
	assists: number;
	steals: number;
	blocks: number;
	turnovers: number;
	teamPoints: number | null;
	opponentPoints: number | null;
}) {
	const efficiency = input.breakdown.efficiency ?? 'not available';
	const gameContext = input.breakdown.gameContext ?? 'not available';
	const lines = [
		`Official GameChanger Rating for ${input.playerName}: ${input.rating.toFixed(1)} (${input.meaning})`,
		`Rating version: ${RATING_VERSION}`,
		`Impact score: ${input.impactScore}`,
		`Division percentile: ${input.percentile}`,
		'Breakdown:',
		`Scoring impact: ${input.breakdown.scoring}`,
		`Efficiency: ${efficiency}`,
		`Rebounding impact: ${input.breakdown.rebounding}`,
		`Playmaking impact: ${input.breakdown.playmaking}`,
		`Defensive impact: ${input.breakdown.defence}`,
		`Ball security: ${input.breakdown.ballSecurity}`,
		`Game context (explanation only, not added to the rating): ${gameContext}`,
		`Stats: ${input.points} PTS, ${input.rebounds} REB, ${input.offensiveRebounds} OREB, ${input.assists} AST, ${input.steals} STL, ${input.blocks} BLK, ${input.turnovers} TO`,
	];
	if (input.teamPoints != null) lines.push(`Team score: ${input.teamPoints}`);
	if (input.opponentPoints != null) lines.push(`Opponent score: ${input.opponentPoints}`);
	lines.push(
		'These figures are the official rating. Explain them. Do not recalculate or invent a different rating. Team score, win/loss, and scoring share are explanation only and are not part of the rating.'
	);
	return lines.join('\n');
}
