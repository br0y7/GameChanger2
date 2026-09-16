import { query } from '$app/server';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { and, countDistinct, eq, gte } from 'drizzle-orm';

function pointsFromRaw(stat: { fgm: number; fg3m: number; ftm: number }) {
	return (stat.fgm - stat.fg3m) * 2 + stat.fg3m * 3 + stat.ftm;
}

type RisingStar = {
	name: string;
	teamName: string;
	divisionName: string;
	pts: number;
	reb: number;
	ast: number;
};

function aggregateRising(
	rows: Array<{
		playerId: string;
		name: string;
		teamName: string;
		divisionName: string;
		fgm: number;
		fg3m: number;
		ftm: number;
		oreb: number;
		dreb: number;
		ast: number;
	}>
): RisingStar[] {
	const map = new Map<
		string,
		{
			name: string;
			teamName: string;
			divisionName: string;
			pts: number;
			reb: number;
			ast: number;
			gp: number;
		}
	>();
	for (const row of rows) {
		const cur = map.get(row.playerId) ?? {
			name: row.name,
			teamName: row.teamName,
			divisionName: row.divisionName,
			pts: 0,
			reb: 0,
			ast: 0,
			gp: 0,
		};
		cur.pts += pointsFromRaw(row);
		cur.reb += row.oreb + row.dreb;
		cur.ast += row.ast;
		cur.gp += 1;
		map.set(row.playerId, cur);
	}
	return [...map.values()]
		.map((p) => ({
			name: p.name,
			teamName: p.teamName,
			divisionName: p.divisionName,
			pts: p.gp ? Math.round((p.pts / p.gp) * 10) / 10 : 0,
			reb: p.gp ? Math.round((p.reb / p.gp) * 10) / 10 : 0,
			ast: p.gp ? Math.round((p.ast / p.gp) * 10) / 10 : 0,
		}))
		.sort((a, b) => b.pts - a.pts)
		.slice(0, 5);
}

/** Public homepage snapshot for the featured (or first) league season. */
export const getPublicHomeSnapshot = query(async () => {
	const empty = {
		league: null as { name: string; slug: string; logo: string | null } | null,
		season: null as { id: string; name: string; slug: string } | null,
		counts: { players: 0, teams: 0, games: 0, divisions: 0 },
		latestGames: [] as Array<{
			id: string;
			awayName: string;
			homeName: string;
			awayScore: number | null;
			homeScore: number | null;
			at: Date | null;
		}>,
		upcomingGames: [] as Array<{
			id: string;
			awayName: string;
			homeName: string;
			at: Date | null;
		}>,
		standings: [] as Array<{ name: string; wins: number; losses: number }>,
		risingStars: [] as RisingStar[],
	};

	const org =
		(await db.query.organization.findFirst({
			where: { slug: 'winnipeg-rising-star' },
		})) ??
		(await db.query.organization.findFirst({
			where: { type: 'league' },
			orderBy: { createdAt: 'asc' },
		}));

	if (!org) return empty;

	const season =
		(await db.query.season.findFirst({
			where: { organizationId: org.id, status: 'active' },
			orderBy: { createdAt: 'desc' },
		})) ??
		(await db.query.season.findFirst({
			where: { organizationId: org.id },
			orderBy: { createdAt: 'desc' },
		}));

	if (!season) {
		return {
			...empty,
			league: { name: org.name, slug: org.slug, logo: org.logo ?? null },
		};
	}

	const [[counts], latestGames, upcomingGames, divisions, gameCountRow] = await Promise.all([
		db
			.select({
				divisions: countDistinct(table.division.id),
				teams: countDistinct(table.team.id),
				players: countDistinct(table.player.id),
			})
			.from(table.division)
			.leftJoin(table.team, eq(table.team.divisionId, table.division.id))
			.leftJoin(table.player, eq(table.player.teamId, table.team.id))
			.where(eq(table.division.seasonId, season.id)),
		db.query.game.findMany({
			where: { seasonId: season.id, status: 'completed' },
			with: {
				homeTeam: { columns: { name: true } },
				awayTeam: { columns: { name: true } },
			},
			orderBy: { completedAt: 'desc' },
			limit: 3,
		}),
		db.query.game.findMany({
			where: { seasonId: season.id, status: 'upcoming' },
			with: {
				homeTeam: { columns: { name: true } },
				awayTeam: { columns: { name: true } },
			},
			orderBy: { scheduledAt: 'asc' },
			limit: 3,
		}),
		db.query.division.findMany({
			where: { seasonId: season.id },
			with: { teams: { columns: { id: true, name: true } } },
			orderBy: { name: 'asc' },
			limit: 1,
		}),
		db
			.select({ n: countDistinct(table.game.id) })
			.from(table.game)
			.where(eq(table.game.seasonId, season.id)),
	]);

	const standingsTeams = divisions[0]?.teams ?? [];
	const completed = await db.query.game.findMany({
		where: { seasonId: season.id, status: 'completed', gameType: 'regular' },
		columns: {
			homeTeamId: true,
			awayTeamId: true,
			homeTeamScore: true,
			awayTeamScore: true,
		},
	});
	const teamIds = new Set(standingsTeams.map((t) => t.id));
	const standings = standingsTeams
		.map((team) => {
			let wins = 0;
			let losses = 0;
			for (const g of completed) {
				if (!teamIds.has(g.homeTeamId) || !teamIds.has(g.awayTeamId)) continue;
				const hs = g.homeTeamScore ?? 0;
				const as = g.awayTeamScore ?? 0;
				if (hs === 0 && as === 0) continue;
				if (g.homeTeamId === team.id) {
					if (hs > as) wins += 1;
					else if (hs < as) losses += 1;
				} else if (g.awayTeamId === team.id) {
					if (as > hs) wins += 1;
					else if (as < hs) losses += 1;
				}
			}
			return { name: team.name, wins, losses };
		})
		.sort((a, b) => b.wins - a.wins || a.losses - b.losses)
		.slice(0, 5);

	const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
	const recentRows = await db
		.select({
			playerId: table.playerGameStat.playerId,
			name: table.player.name,
			teamName: table.team.name,
			divisionName: table.division.name,
			fgm: table.playerGameStat.fgm,
			fg3m: table.playerGameStat.fg3m,
			ftm: table.playerGameStat.ftm,
			oreb: table.playerGameStat.oreb,
			dreb: table.playerGameStat.dreb,
			ast: table.playerGameStat.ast,
		})
		.from(table.playerGameStat)
		.innerJoin(table.game, eq(table.playerGameStat.gameId, table.game.id))
		.innerJoin(table.player, eq(table.playerGameStat.playerId, table.player.id))
		.innerJoin(table.team, eq(table.player.teamId, table.team.id))
		.innerJoin(table.division, eq(table.team.divisionId, table.division.id))
		.where(and(eq(table.game.seasonId, season.id), gte(table.game.completedAt, since)));

	let risingStars = aggregateRising(recentRows);

	if (risingStars.length === 0) {
		const seasonRows = await db
			.select({
				playerId: table.playerGameStat.playerId,
				name: table.player.name,
				teamName: table.team.name,
				divisionName: table.division.name,
				fgm: table.playerGameStat.fgm,
				fg3m: table.playerGameStat.fg3m,
				ftm: table.playerGameStat.ftm,
				oreb: table.playerGameStat.oreb,
				dreb: table.playerGameStat.dreb,
				ast: table.playerGameStat.ast,
			})
			.from(table.playerGameStat)
			.innerJoin(table.game, eq(table.playerGameStat.gameId, table.game.id))
			.innerJoin(table.player, eq(table.playerGameStat.playerId, table.player.id))
			.innerJoin(table.team, eq(table.player.teamId, table.team.id))
			.innerJoin(table.division, eq(table.team.divisionId, table.division.id))
			.where(eq(table.game.seasonId, season.id))
			.limit(2000);

		risingStars = aggregateRising(seasonRows);
	}

	return {
		league: { name: org.name, slug: org.slug, logo: org.logo ?? null },
		season: { id: season.id, name: season.name, slug: season.slug },
		counts: {
			players: Number(counts?.players ?? 0),
			teams: Number(counts?.teams ?? 0),
			games: Number(gameCountRow[0]?.n ?? 0),
			divisions: Number(counts?.divisions ?? 0),
		},
		latestGames: latestGames.map((g) => ({
			id: g.id,
			awayName: g.awayTeam?.name ?? 'Away',
			homeName: g.homeTeam?.name ?? 'Home',
			awayScore: g.awayTeamScore,
			homeScore: g.homeTeamScore,
			at: g.completedAt ?? g.scheduledAt,
		})),
		upcomingGames: upcomingGames.map((g) => ({
			id: g.id,
			awayName: g.awayTeam?.name ?? 'Away',
			homeName: g.homeTeam?.name ?? 'Home',
			at: g.scheduledAt,
		})),
		standings,
		risingStars,
	};
});
