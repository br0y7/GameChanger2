import type { PlayerGameStats, WithGame } from '$lib/schemas/player-game-stat';
import { rawStatKeys } from '$lib/schemas/player-game-stat';
import type { RawPlayerGameStats } from '$lib/server/db/schema';

/** True when this row is a box-score appearance, not a leftover DNP / empty line. */
export function playerAppearedOnSheet(stat: {
	recordedPts?: number | null;
	[key: string]: unknown;
}): boolean {
	if (stat.recordedPts != null) return true;
	return rawStatKeys.some((key) => Number(stat[key]) > 0);
}

/** Sheet recorded PTS and left the rest of the box blank (no footage). */
export function isPointsOnlyLine(stat: {
	recordedPts?: number | null;
	[key: string]: unknown;
}): boolean {
	if (stat.recordedPts == null) return false;
	return rawStatKeys.every((key) => Number(stat[key]) === 0);
}

export function derivePlayerGameStats(
	rawStats: WithGame<RawPlayerGameStats>
): WithGame<PlayerGameStats> {
	const { fgm, fga, fg3m, fg3a, ftm, fta, oreb, dreb, ast, stl, blk, tov, pf } = rawStats;

	const pointsOnly = isPointsOnlyLine(rawStats);
	const fromShots = (fgm - fg3m) * 2 + fg3m * 3 + ftm;
	const pts = rawStats.recordedPts ?? fromShots;
	const fgPct = fga > 0 ? fgm / fga : 0;
	const fg3Pct = fg3a > 0 ? fg3m / fg3a : 0;
	const ftPct = fta > 0 ? ftm / fta : 0;
	const reb = oreb + dreb;
	const eff = pts + reb + ast + stl + blk - (tov + pf);

	return {
		...rawStats,
		pts,
		fgPct,
		fg3Pct,
		ftPct,
		reb,
		eff,
		pointsOnly,
	};
}
