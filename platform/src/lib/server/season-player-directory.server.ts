import { db } from '$lib/server/db';
import { derivePlayerGameStats } from '$lib/stats/player-game-stats';
import { derivePlayerStats } from '$lib/stats/player-stats';
import {
	displayRankValue,
	formatRankPlace,
	placeInGroup,
	rankListLimit,
	rankedLeaders,
	rankedStatKeys,
	type RankedStatKey,
	type RankRow,
} from '$lib/stats/stat-ranks';
import { trueShootingPercentage } from '$lib/utils/collection';

export type SeasonPlayerLine = {
	id: string;
	name: string;
	jerseyNumber: string;
	teamName: string;
	teamSlug: string;
	divisionId: string;
	divisionName: string;
	divisionSlug: string;
	gp: number;
	values: RankRow['values'];
};

/** Every player in the season who has at least one game, with per-game averages. */
export async function loadSeasonPlayerLines(seasonId: string): Promise<SeasonPlayerLine[]> {
	const divisions = await db.query.division.findMany({
		where: { seasonId },
		with: {
			teams: {
				with: {
					players: { with: { gameStats: true } },
				},
			},
		},
	});

	const lines: SeasonPlayerLine[] = [];

	for (const division of divisions) {
		for (const team of division.teams) {
			for (const rosterPlayer of team.players) {
				const games = rosterPlayer.gameStats.map((stat) => derivePlayerGameStats(stat));
				if (!games.length) continue;
				const stats = derivePlayerStats(games);
				const gp = games.length;
				const total = (key: 'fga' | 'fg3a' | 'fta') => stats.raw[key].total ?? 0;
				const fga = total('fga');
				const fg3a = total('fg3a');
				const fta = total('fta');
				const ppg = stats.derived.pts.average ?? 0;
				const values: RankRow['values'] = {
					points: ppg,
					rebounds: stats.derived.reb.average ?? 0,
					assists: stats.raw.ast.average ?? 0,
					steals: stats.raw.stl.average ?? 0,
					blocks: stats.raw.blk.average ?? 0,
					oreb: stats.raw.oreb.average ?? 0,
					dreb: stats.raw.dreb.average ?? 0,
					threes: stats.raw.fg3m.average ?? 0,
					fts: stats.raw.ftm.average ?? 0,
				};
				if (fga >= 5) values.fg = stats.derived.fgPct.average ?? 0;
				if (fg3a >= 3) values.fg3 = stats.derived.fg3Pct.average ?? 0;
				if (fta >= 3) values.ft = stats.derived.ftPct.average ?? 0;
				if (fga + fta > 0) values.ts = trueShootingPercentage(ppg, fga / gp, fta / gp);

				lines.push({
					id: rosterPlayer.id,
					name: rosterPlayer.name,
					jerseyNumber: rosterPlayer.jerseyNumber,
					teamName: team.name,
					teamSlug: team.slug,
					divisionId: division.id,
					divisionName: division.name,
					divisionSlug: division.slug,
					gp,
					values,
				});
			}
		}
	}

	return lines.sort((a, b) => a.name.localeCompare(b.name));
}

function pct(n: number | undefined) {
	return n == null ? 'n/a' : `${(n * 100).toFixed(1)}%`;
}

const rankLabels: Record<RankedStatKey, string> = {
	points: 'PTS',
	rebounds: 'REB',
	assists: 'AST',
	steals: 'STL',
	blocks: 'BLK',
	oreb: 'OR',
	dreb: 'DR',
	threes: '3PM',
	fts: 'FTM',
	fg: 'FG',
	fg3: '3P',
	ft: 'FT',
	ts: 'TS',
};

const leaderboardTitles: Record<RankedStatKey, string> = {
	points: 'Points per game',
	rebounds: 'Rebounds per game',
	assists: 'Assists per game',
	steals: 'Steals per game',
	blocks: 'Blocks per game',
	oreb: 'Offensive rebounds per game',
	dreb: 'Defensive rebounds per game',
	threes: 'Threes made per game',
	fts: 'Free throws made per game',
	fg: 'Field goal %',
	fg3: 'Three-point %',
	ft: 'Free throw %',
	ts: 'True shooting %',
};

function formatLeaderValue(key: RankedStatKey, value: number) {
	if (key === 'fg' || key === 'fg3' || key === 'ft' || key === 'ts') {
		return `${(value * 100).toFixed(1)}%`;
	}
	return value.toFixed(1);
}

function leadersFor(players: SeasonPlayerLine[], key: RankedStatKey) {
	return rankedLeaders(
		players
			.filter((player) => player.values[key] != null)
			.map((player) => ({
				id: player.id,
				value: displayRankValue(key, player.values[key]!),
				name: player.name,
				teamName: player.teamName,
				divisionName: player.divisionName,
			})),
		rankListLimit
	);
}

function divisionRankNote(players: SeasonPlayerLine[], player: SeasonPlayerLine) {
	const pool = players.filter((line) => line.divisionId === player.divisionId);
	const notes: string[] = [];

	for (const key of rankedStatKeys) {
		const rows = pool
			.filter((line) => line.values[key] != null)
			.map((line) => ({ id: line.id, value: displayRankValue(key, line.values[key]!) }));
		const place = placeInGroup(rows, player.id, rankListLimit);
		if (!place) continue;
		notes.push(`${rankLabels[key]} ${formatRankPlace(place)}`);
	}

	if (!notes.length) return '';
	return ` Div ${notes.join(', ')}.`;
}

export function formatSeasonPlayerLine(player: SeasonPlayerLine, players: SeasonPlayerLine[] = []) {
	const v = player.values;
	return `- ${player.name} #${player.jerseyNumber}, ${player.teamName}, ${player.divisionName}: ${(v.points ?? 0).toFixed(1)} PPG, ${(v.rebounds ?? 0).toFixed(1)} RPG, ${(v.assists ?? 0).toFixed(1)} APG, ${(v.steals ?? 0).toFixed(1)} SPG, ${(v.blocks ?? 0).toFixed(1)} BPG, OR ${(v.oreb ?? 0).toFixed(1)}, DR ${(v.dreb ?? 0).toFixed(1)}, 3PM ${(v.threes ?? 0).toFixed(1)}, FTM ${(v.fts ?? 0).toFixed(1)}, FG ${pct(v.fg)}, 3P ${pct(v.fg3)}, FT ${pct(v.ft)}, TS ${pct(v.ts)}, ${player.gp} GP.${divisionRankNote(players, player)}`;
}

function formatBoardLine(title: string, leaders: ReturnType<typeof leadersFor>, key: RankedStatKey) {
	const list = leaders
		.map((leader) => `${formatRankPlace(leader)} ${leader.name} ${formatLeaderValue(key, leader.value)}`)
		.join(', ');
	return `${title}: ${list}`;
}

/** League top 10, plus the open division's top 10. Each category is one line. */
export function formatSeasonLeaderboards(players: SeasonPlayerLine[], focusDivisionName?: string | null) {
	const lines: string[] = [
		'Top 10 leaderboards. Tied players share one rank, written T - 4. When asked who leads a stat or for a top 10 list, answer from these lists. Do not say this data is missing.',
		'League:',
	];

	for (const key of rankedStatKeys) {
		const leaders = leadersFor(players, key);
		if (!leaders.length) continue;
		lines.push(formatBoardLine(leaderboardTitles[key], leaders, key));
	}

	const divisionName = focusDivisionName?.trim();
	if (divisionName) {
		const pool = players.filter((player) => player.divisionName === divisionName);
		if (pool.length) {
			lines.push('');
			lines.push(`${divisionName} top 10:`);
			for (const key of rankedStatKeys) {
				const leaders = leadersFor(pool, key);
				if (!leaders.length) continue;
				lines.push(formatBoardLine(leaderboardTitles[key], leaders, key));
			}
		}
	}

	return lines.join('\n');
}
