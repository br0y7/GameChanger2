import type { PlayerGameStats } from '$lib/schemas/player-game-stat';
import { averageBy, shootingPercentageBy } from '$lib/utils/collection';

export function boxScoreGames<T extends { pointsOnly?: boolean }>(stats: T[]): T[] {
	return stats.filter((stat) => !stat.pointsOnly);
}

/** Leaderboards skip points-only sheets so 0-reb / 0-ast lines do not drag averages. */
export function leaderAveragesFromGames(stats: PlayerGameStats[]) {
	const box = boxScoreGames(stats);
	if (box.length === 0) return null;
	return seasonAveragesFromGames(box);
}

export function seasonAveragesFromGames(stats: PlayerGameStats[]) {
	const box = boxScoreGames(stats);
	const fgPct = shootingPercentageBy(
		box,
		(stat) => stat.fgm,
		(stat) => stat.fga
	) ?? null;
	const fg3Pct = shootingPercentageBy(
		box,
		(stat) => stat.fg3m,
		(stat) => stat.fg3a
	) ?? null;
	const ftPct = shootingPercentageBy(
		box,
		(stat) => stat.ftm,
		(stat) => stat.fta
	) ?? null;

	const avg = (pick: (stat: PlayerGameStats) => number) => averageBy(box, pick) ?? 0;

	return {
		gamesPlayed: box.length,
		points: avg((stat) => stat.pts),
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
