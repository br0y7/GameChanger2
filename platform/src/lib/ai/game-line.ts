/** Full box line for Ask AI. These fields can stay off the visible game log. */
export type AiGameLineStats = {
	label: string;
	pointsOnly?: boolean;
	pts: number;
	reb: number;
	oreb: number;
	dreb?: number;
	ast: number;
	stl: number;
	blk: number;
	tov: number;
	pf?: number;
	fgm?: number;
	fga?: number;
	fg3m?: number;
	fg3a?: number;
	ftm?: number;
	fta?: number;
	fgPct?: number | null;
	fg3Pct?: number | null;
	ftPct?: number | null;
	gameRating?: number | null;
};

function shooting(makes: number | undefined, attempts: number | undefined, stored?: number | null) {
	if (stored != null && Number.isFinite(stored)) return `${(stored * 100).toFixed(1)}%`;
	if (attempts == null || attempts <= 0) return 'not recorded';
	return `${(((makes ?? 0) / attempts) * 100).toFixed(1)}%`;
}

function pair(makes: number | undefined, attempts: number | undefined, stored?: number | null) {
	if (makes == null && attempts == null && stored == null) return 'not recorded';
	return `${makes ?? 0}-${attempts ?? 0} (${shooting(makes, attempts, stored)})`;
}

/** One game for the model: counting stats, OREB/DREB, and shooting % even when the UI hides them. */
export function formatAiGameLine(line: AiGameLineStats) {
	if (line.pointsOnly) {
		return `- ${line.label}: ${line.pts} PTS (points-only; other box stats were not recorded)`;
	}

	const dreb = line.dreb ?? Math.max(0, line.reb - line.oreb);
	const rating = line.gameRating == null ? '' : `, rating ${line.gameRating.toFixed(1)}`;
	const fouls = line.pf == null ? '' : `, ${line.pf} PF`;

	return `- ${line.label}: ${line.pts} PTS, ${line.reb} REB (${line.oreb} OREB, ${dreb} DREB), ${line.ast} AST, ${line.stl} STL, ${line.blk} BLK, ${line.tov} TO${fouls}, FG ${pair(line.fgm, line.fga, line.fgPct)}, 3P ${pair(line.fg3m, line.fg3a, line.fg3Pct)}, FT ${pair(line.ftm, line.fta, line.ftPct)}${rating}`;
}
