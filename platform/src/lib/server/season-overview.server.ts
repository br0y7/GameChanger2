import { db } from '$lib/server/db';
import { mergeDuplicateTeamsForSeason } from '$lib/import/duplicate-teams.server';
import { isJerseyNumberTeamName } from '$lib/import/team-match';
import { correctFalsePlayoffTypes } from '$lib/stats/matchup';
import { divisionPlaceForTeam, playoffFinishLabel } from '$lib/stats/division-place';
import {
	displayRankValue,
	rankedLeaders,
	type RankedStatKey,
} from '$lib/stats/stat-ranks';
import { playoffRecords, regularSeasonStandings } from '$lib/stats/standings';
import { loadSeasonPlayerLines, type SeasonPlayerLine } from './season-player-directory.server';

export const overviewLeaderKeys = [
	{ key: 'points', label: 'Points', suffix: 'PPG' },
	{ key: 'rebounds', label: 'Rebounds', suffix: 'RPG' },
	{ key: 'assists', label: 'Assists', suffix: 'APG' },
	{ key: 'steals', label: 'Steals', suffix: 'SPG' },
	{ key: 'blocks', label: 'Blocks', suffix: 'BPG' },
] as const satisfies ReadonlyArray<{ key: RankedStatKey; label: string; suffix: string }>;

const overviewLeaderLimit = 10;

export type SeasonOverviewLeader = {
	playerId: string;
	name: string;
	jerseyNumber: string;
	teamName: string;
	teamSlug: string;
	divisionName: string;
	divisionSlug: string;
	value: number;
	place: number;
	tied: boolean;
};

export type SeasonOverviewBoard = {
	key: RankedStatKey;
	label: string;
	suffix: string;
	leaders: SeasonOverviewLeader[];
};

export type SeasonOverviewRecordRow = {
	teamId: string;
	name: string;
	slug: string;
	rank: number;
	regularWins: number;
	regularLosses: number;
	regularTies: number;
	playoffWins: number;
	playoffLosses: number;
	playoffTies: number;
	playoffGames: number;
	place: string | null;
};

export type SeasonOverviewDivision = {
	id: string;
	name: string;
	slug: string;
	boards: SeasonOverviewBoard[];
	rows: SeasonOverviewRecordRow[];
};

export type SeasonOverviewBoards = {
	seasonId: string;
	divisions: SeasonOverviewDivision[];
};

function pointsFromRaw(stat: {
	fgm: number;
	fg3m: number;
	ftm: number;
	recordedPts?: number | null;
}) {
	if (stat.recordedPts != null) return stat.recordedPts;
	return (stat.fgm - stat.fg3m) * 2 + stat.fg3m * 3 + stat.ftm;
}

function boardsFromPlayers(players: SeasonPlayerLine[]): SeasonOverviewBoard[] {
	return overviewLeaderKeys.map(({ key, label, suffix }) => ({
		key,
		label,
		suffix,
		leaders: rankedLeaders(
			players
				.filter((player) => player.values[key] != null)
				.map((player) => ({
					playerId: player.id,
					id: player.id,
					name: player.name,
					jerseyNumber: player.jerseyNumber,
					teamName: player.teamName,
					teamSlug: player.teamSlug,
					divisionName: player.divisionName,
					divisionSlug: player.divisionSlug,
					value: displayRankValue(key, player.values[key]!),
				})),
			overviewLeaderLimit
		).map(({ id: _id, ...leader }) => leader),
	}));
}

export async function loadSeasonOverviewBoards(seasonId: string): Promise<SeasonOverviewBoards> {
	await mergeDuplicateTeamsForSeason(seasonId);

	const [divisions, games, directory] = await Promise.all([
		db.query.division.findMany({
			where: { seasonId },
			columns: { id: true, name: true, slug: true },
			with: {
				teams: {
					columns: { id: true, name: true, slug: true },
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
		loadSeasonPlayerLines(seasonId),
	]);

	const realDivisions = divisions.map((division) => ({
		...division,
		teams: division.teams.filter((team) => !isJerseyNumberTeamName(team.name)),
	}));
	const realTeamNames = new Set(
		realDivisions.flatMap((division) => division.teams.map((team) => team.name))
	);
	const players = directory.filter((player) => realTeamNames.has(player.teamName));

	const scored = correctFalsePlayoffTypes(games).map((game) => {
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

	return {
		seasonId,
		divisions: realDivisions.map((division) => {
			const teamIds = division.teams.map((team) => team.id);
			const ranked = regularSeasonStandings(teamIds, scored);
			const playoffs = new Map(playoffRecords(teamIds, scored).map((row) => [row.teamId, row]));
			const teamById = new Map(division.teams.map((team) => [team.id, team]));
			const divisionGames = scored.filter(
				(game) => teamIds.includes(game.homeTeamId) && teamIds.includes(game.awayTeamId)
			);

			return {
				id: division.id,
				name: division.name,
				slug: division.slug,
				boards: boardsFromPlayers(players.filter((player) => player.divisionId === division.id)),
				rows: ranked.flatMap((standing) => {
					const team = teamById.get(standing.teamId);
					if (!team) return [];
					const playoff = playoffs.get(standing.teamId);
					const place = divisionPlaceForTeam(
						standing.teamId,
						divisionGames.map((game) => ({
							gameType: game.gameType ?? 'regular',
							homeTeamId: game.homeTeamId,
							awayTeamId: game.awayTeamId,
							homeScore: game.homeTeamScore,
							awayScore: game.awayTeamScore,
							completedAt: (game.completedAt ?? game.scheduledAt ?? new Date(0)).getTime(),
						}))
					);
					return [
						{
							teamId: team.id,
							name: team.name,
							slug: team.slug,
							rank: standing.rank,
							regularWins: standing.wins,
							regularLosses: standing.losses,
							regularTies: standing.ties,
							playoffWins: playoff?.wins ?? 0,
							playoffLosses: playoff?.losses ?? 0,
							playoffTies: playoff?.ties ?? 0,
							playoffGames: playoff?.gamesPlayed ?? 0,
							place: playoffFinishLabel(place),
						},
					];
				}),
			};
		}),
	};
}
