import { query } from '$app/server';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { and, countDistinct, eq, gte } from 'drizzle-orm';
import { regularSeasonStandings } from '$lib/stats/standings';

function pointsFromRaw(stat: { fgm: number; fg3m: number; ftm: number }) {
	return (stat.fgm - stat.fg3m) * 2 + stat.fg3m * 3 + stat.ftm;
}

type RisingStar = {
	playerId: string;
	name: string;
	teamName: string;
	teamSlug: string;
	divisionName: string;
	divisionSlug: string;
	pts: number;
	reb: number;
	ast: number;
};

function aggregateRising(
	rows: Array<{
		playerId: string;
		name: string;
		teamName: string;
		teamSlug: string;
		divisionName: string;
		divisionSlug: string;
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
			playerId: string;
			name: string;
			teamName: string;
			teamSlug: string;
			divisionName: string;
			divisionSlug: string;
			pts: number;
			reb: number;
			ast: number;
			gp: number;
		}
	>();
	for (const row of rows) {
		const cur = map.get(row.playerId) ?? {
			playerId: row.playerId,
			name: row.name,
			teamName: row.teamName,
			teamSlug: row.teamSlug,
			divisionName: row.divisionName,
			divisionSlug: row.divisionSlug,
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
			playerId: p.playerId,
			name: p.name,
			teamName: p.teamName,
			teamSlug: p.teamSlug,
			divisionName: p.divisionName,
			divisionSlug: p.divisionSlug,
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
		standings: [] as Array<{
			name: string;
			slug: string;
			divisionSlug: string;
			wins: number;
			losses: number;
			rank: number;
		}>,
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
			with: { teams: { columns: { id: true, name: true, slug: true } } },
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
		where: { seasonId: season.id, status: 'completed' },
		columns: {
			id: true,
			homeTeamId: true,
			awayTeamId: true,
			homeTeamScore: true,
			awayTeamScore: true,
			gameType: true,
			status: true,
			statsAvailable: true,
			completedAt: true,
			scheduledAt: true,
		},
	});
	const scoredGames = completed.flatMap((game) => {
		const homeTeamScore = game.homeTeamScore ?? 0;
		const awayTeamScore = game.awayTeamScore ?? 0;
		if (homeTeamScore === 0 && awayTeamScore === 0) return [];
		return [{ ...game, homeTeamScore, awayTeamScore }];
	});
	const teamById = new Map(standingsTeams.map((team) => [team.id, team]));
	const standings = regularSeasonStandings(
		standingsTeams.map((team) => team.id),
		scoredGames
	)
		.flatMap((standing) => {
			const team = teamById.get(standing.teamId);
			if (!team) return [];
			return [
				{
					name: team.name,
					slug: team.slug,
					divisionSlug: divisions[0]?.slug ?? '',
					wins: standing.wins,
					losses: standing.losses,
					rank: standing.rank,
				},
			];
		})
		.slice(0, 5);

	const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
	const recentRows = await db
		.select({
			playerId: table.playerGameStat.playerId,
			name: table.player.name,
			teamName: table.team.name,
			teamSlug: table.team.slug,
			divisionName: table.division.name,
			divisionSlug: table.division.slug,
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
				teamSlug: table.team.slug,
				divisionName: table.division.name,
				divisionSlug: table.division.slug,
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
