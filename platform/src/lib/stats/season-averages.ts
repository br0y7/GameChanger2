import type { PlayerGameStats } from '$lib/schemas/player-game-stat';
import { averageBy, shootingPercentageBy } from '$lib/utils/collection';

export function seasonAveragesFromGames(stats: PlayerGameStats[]) {
	const box = stats.filter((stat) => !stat.pointsOnly);
	const fgPct = shootingPercentageBy(
		box,
		(stat) => stat.fgm,
		(stat) => stat.fga
	);
	const fg3Pct = shootingPercentageBy(
		box,
		(stat) => stat.fg3m,
		(stat) => stat.fg3a
	);
	const ftPct = shootingPercentageBy(
		box,
		(stat) => stat.ftm,
		(stat) => stat.fta
	);

	const avg = (pick: (stat: PlayerGameStats) => number) => averageBy(box, pick) ?? 0;
	const points = averageBy(stats, (stat) => stat.pts) ?? 0;

	return {
		gamesPlayed: stats.length,
		points,
		rebounds: avg((stat) => stat.reb),
		assists: avg((stat) => stat.ast),
		steals: avg((stat) => stat.stl),
		blocks: avg((stat) => stat.blk),
		turnovers: avg((stat) => stat.tov),
		fgm: avg((stat) => stat.fgm),
		fga: avg((stat) => stat.fga),
		fg3m: avg((stat) => stat.fg3m),
		fg3a: avg((stat) => stat.fg3a),
		ftm: avg((stat) => stat.ftm),
		fta: avg((stat) => stat.fta),
		oreb: avg((stat) => stat.oreb),
		dreb: avg((stat) => stat.dreb),
		pf: avg((stat) => stat.pf),
		eff: avg((stat) => stat.eff),
		fgPct,
		fg3Pct,
		ftPct,
		shootingPercentage: fgPct,
	};
}
