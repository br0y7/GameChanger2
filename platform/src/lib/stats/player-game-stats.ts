import type { PlayerGameStat, WithGame } from '$lib/schemas/player-game-stat';
import type { RawPlayerGameStat } from '$lib/server/db/schema';

export function derivePlayerStats(rawStats: WithGame<RawPlayerGameStat>): WithGame<PlayerGameStat> {
	const { fgm, fga, fg3m, fg3a, ftm, fta, oreb, dreb, ast, stl, blk, tov, pf } = rawStats;

	const pts = (fgm - fg3m) * 2 + fg3m * 3 + ftm;
	const fgPct = fgm / (fga || 1); // prevent division by zero
	const fg3Pct = fg3m / (fg3a || 1);
	const ftPct = ftm / (fta || 1);
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
