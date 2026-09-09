import type { PlayerGameStats, WithGame } from '$lib/schemas/player-game-stat';
import type { RawPlayerGameStats } from '$lib/server/db/schema';

export function derivePlayerGameStats(
	rawStats: WithGame<RawPlayerGameStats>
): WithGame<PlayerGameStats> {
	const { fgm, fga, fg3m, fg3a, ftm, fta, oreb, dreb, ast, stl, blk, tov, pf } = rawStats;

	const pts = (fgm - fg3m) * 2 + fg3m * 3 + ftm;
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
	};
}
