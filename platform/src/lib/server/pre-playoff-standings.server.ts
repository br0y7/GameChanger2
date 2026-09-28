import { db } from '$lib/server/db';
import { regularSeasonStandings } from '$lib/stats/standings';
import {
	formatPrePlayoffStandings,
	type PrePlayoffDivision,
} from '$lib/stats/pre-playoff-standings';

export { formatPrePlayoffStandings };
export type { PrePlayoffDivision, PrePlayoffStandingRow } from '$lib/stats/pre-playoff-standings';

function pointsFromRaw(stat: {
	fgm: number;
	fg3m: number;
	ftm: number;
	recordedPts?: number | null;
}) {
	if (stat.recordedPts != null) return stat.recordedPts;
	return (stat.fgm - stat.fg3m) * 2 + stat.fg3m * 3 + stat.ftm;
}

export async function loadPrePlayoffStandings(seasonId: string): Promise<PrePlayoffDivision[]> {
	const [divisions, games] = await Promise.all([
		db.query.division.findMany({
			where: { seasonId },
			columns: { id: true, name: true },
			with: {
				teams: {
					columns: { id: true, name: true },
					orderBy: { name: 'asc' },
				},
			},
			orderBy: { name: 'asc' },
		}),
		db.query.game.findMany({
			where: { seasonId, status: 'completed' },
			with: {
				playerStats: {
					with: { player: { columns: { teamId: true } } },
				},
			},
		}),
	]);

	const scored = games.map((game) => {
		let home = game.homeTeamScore ?? 0;
		let away = game.awayTeamScore ?? 0;
		if (home === 0 && away === 0) {
			for (const stat of game.playerStats) {
				const pts = pointsFromRaw(stat);
				if (stat.player?.teamId === game.homeTeamId) home += pts;
				else if (stat.player?.teamId === game.awayTeamId) away += pts;
			}
		}
		return { ...game, homeTeamScore: home, awayTeamScore: away };
	});

	return divisions.map((division) => {
		const standings = regularSeasonStandings(
			division.teams.map((team) => team.id),
			scored
		);
		const names = new Map(division.teams.map((team) => [team.id, team.name]));
		return {
			name: division.name,
			rows: standings.map((row) => ({
				rank: row.rank,
				name: names.get(row.teamId) ?? 'Team',
				wins: row.wins,
				losses: row.losses,
				ties: row.ties,
			})),
		};
	});
}
