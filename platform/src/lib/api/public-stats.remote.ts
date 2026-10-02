import { form, query } from '$app/server';
import { idField } from '$lib/schemas/common';
import {
	DEFAULT_LEAGUE_VISIBILITY,
	leagueVisibilitySchema,
	type LeagueVisibilityFlags,
} from '$lib/schemas/league-visibility';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { forbidden, notFound } from '$lib/server/fail';
import { correctFalsePlayoffTypes, dedupeMatchups } from '$lib/stats/matchup';
import { regularSeasonGames, regularSeasonStandings } from '$lib/stats/standings';
import { derivePlayerGameStats, playerAppearedOnSheet } from '$lib/stats/player-game-stats';
import { loadBoxScore } from '$lib/server/game-box-score.server';
import { countDistinct, eq } from 'drizzle-orm';
import { z } from 'zod';
import { isUserAdmin, requireUser } from './auth.remote';
import { isUserLeagueOrganizer } from './league.remote';
import { isJerseyNumberTeamName } from '$lib/import/team-match';
import { mergeDuplicateTeamsForSeason } from '$lib/import/duplicate-teams.server';

export type PublicVisibility = LeagueVisibilityFlags & {
	organizationId?: string;
};

async function visibilityForOrg(organizationId: string): Promise<PublicVisibility> {
	const row = await db.query.leagueVisibility.findFirst({
		where: { organizationId },
	});
	if (!row) return { ...DEFAULT_LEAGUE_VISIBILITY, organizationId };
	return {
		organizationId,
		isListed: row.isListed,
		publishStandings: row.publishStandings,
		publishGameScores: row.publishGameScores,
		publishTeamStats: row.publishTeamStats,
		publishPlayerStats: row.publishPlayerStats,
		showPlayerFullNames: row.showPlayerFullNames,
		showPlayerPhotos: row.showPlayerPhotos,
		showBirthdate: row.showBirthdate,
		publishDevelopmentReports: row.publishDevelopmentReports,
	};
}

function displayName(fullName: string, showFull: boolean) {
	if (showFull) return fullName;
	const parts = fullName.trim().split(/\s+/);
	if (parts.length === 1) return parts[0];
	return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

/** Listed leagues for public discovery. */
export const listPublishedLeagues = query(async () => {
	const orgs = await db.query.organization.findMany({
		where: { type: 'league' },
		orderBy: { name: 'asc' },
	});

	const result = [];
	for (const org of orgs) {
		const vis = await visibilityForOrg(org.id);
		if (!vis.isListed) continue;

		const season =
			(await db.query.season.findFirst({
				where: { organizationId: org.id, status: 'active' },
				orderBy: { createdAt: 'desc' },
			})) ??
			(await db.query.season.findFirst({
				where: { organizationId: org.id },
				orderBy: { createdAt: 'desc' },
			}));

		let counts = { players: 0, teams: 0, divisions: 0, games: 0 };
		if (season) {
			const [[c], games] = await Promise.all([
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
				db
					.select({ n: countDistinct(table.game.id) })
					.from(table.game)
					.where(eq(table.game.seasonId, season.id)),
			]);
			counts = {
				players: Number(c?.players ?? 0),
				teams: Number(c?.teams ?? 0),
				divisions: Number(c?.divisions ?? 0),
				games: Number(games[0]?.n ?? 0),
			};
		}

		result.push({
			id: org.id,
			name: org.name,
			slug: org.slug,
			season: season ? { id: season.id, name: season.name, slug: season.slug } : null,
			counts,
			visibility: vis,
		});
	}
	return result;
});

export const getPublicLeagueMeta = query(z.object({ orgSlug: z.string() }), async ({ orgSlug }) => {
	const org = await db.query.organization.findFirst({
		where: { slug: orgSlug, type: 'league' },
	});
	if (!org) notFound({ resource: 'organization' });

	const vis = await visibilityForOrg(org.id);
	if (!vis.isListed) notFound({ resource: 'organization' });

	const seasons = await db.query.season.findMany({
		where: { organizationId: org.id },
		orderBy: { createdAt: 'desc' },
		columns: { id: true, name: true, slug: true, status: true },
	});

	return {
		id: org.id,
		name: org.name,
		slug: org.slug,
		visibility: vis,
		seasons,
	};
});

export const getPublicSeasonFilters = query(
	z.object({
		orgSlug: z.string(),
		seasonSlug: z.string(),
	}),
	async ({ orgSlug, seasonSlug }) => {
		const meta = await getPublicLeagueMeta({ orgSlug });
		const season = meta.seasons.find((s) => s.slug === seasonSlug);
		if (!season) notFound({ resource: 'season' });

		await mergeDuplicateTeamsForSeason(season.id);

		const divisions = await db.query.division.findMany({
			where: { seasonId: season.id },
			with: { teams: { columns: { id: true, name: true, slug: true } } },
			orderBy: { name: 'asc' },
		});

		return {
			league: { id: meta.id, name: meta.name, slug: meta.slug },
			season,
			visibility: meta.visibility,
			divisions: divisions.map((d) => ({
				id: d.id,
				name: d.name,
				slug: d.slug,
				teams: d.teams
					.filter((t) => !isJerseyNumberTeamName(t.name))
					.map((t) => ({ id: t.id, name: t.name, slug: t.slug })),
			})),
		};
	}
);

type PublicPlayerLeader = {
	playerId: string;
	name: string;
	jerseyNumber: string;
	teamName: string;
	teamSlug: string;
	divisionName: string;
	divisionSlug: string;
	gp: number;
	ppg: number;
	rpg: number;
	apg: number;
	spg: number;
};

type PublicStandingRow = {
	teamId: string;
	name: string;
	slug: string;
	wins: number;
	losses: number;
	rank: number;
};

type PublicStandingDivision = {
	id: string;
	name: string;
	slug: string;
	rows: PublicStandingRow[];
};

export const getPublicPlayerLeaders = query(
	z.object({
		orgSlug: z.string(),
		seasonSlug: z.string(),
		divisionSlug: z.string().optional(),
		teamSlug: z.string().optional(),
		limit: z.number().int().min(1).max(100).default(50),
	}),
	async ({ orgSlug, seasonSlug, divisionSlug, teamSlug, limit }) => {
		const filters = await getPublicSeasonFilters({ orgSlug, seasonSlug });
		if (!filters.visibility.publishPlayerStats) {
			return { players: [] as PublicPlayerLeader[], visibility: filters.visibility };
		}

		let divisionIds = filters.divisions.map((d) => d.id);
		if (divisionSlug) {
			const d = filters.divisions.find((x) => x.slug === divisionSlug);
			divisionIds = d ? [d.id] : [];
		}

		const teams = await db.query.team.findMany({
			where: { divisionId: { in: divisionIds } },
			with: {
				division: { columns: { name: true, slug: true } },
				players: {
					with: {
						gameStats: {
							with: { game: { columns: { id: true, seasonId: true, status: true } } },
						},
					},
				},
			},
		});

		const filteredTeams = teamSlug ? teams.filter((t) => t.slug === teamSlug) : teams;
		const showFull = filters.visibility.showPlayerFullNames;

		const players = filteredTeams.flatMap((team) =>
			team.players.map((player) => {
				const derived = player.gameStats
					.filter(
						(s) =>
							s.game?.seasonId === filters.season.id &&
							s.game.status === 'completed' &&
							playerAppearedOnSheet(s)
					)
					.map((s) => derivePlayerGameStats(s as Parameters<typeof derivePlayerGameStats>[0]));
				const gp = derived.length;
				const avg = (pick: (s: (typeof derived)[number]) => number) =>
					gp ? derived.reduce((a, s) => a + pick(s), 0) / gp : 0;
				return {
					playerId: player.id,
					name: displayName(player.name, showFull),
					jerseyNumber: player.jerseyNumber,
					teamName: team.name,
					teamSlug: team.slug,
					divisionName: team.division?.name ?? '',
					divisionSlug: team.division?.slug ?? '',
					gp,
					ppg: Math.round(avg((s) => s.pts) * 10) / 10,
					rpg: Math.round(avg((s) => s.reb) * 10) / 10,
					apg: Math.round(avg((s) => s.ast) * 10) / 10,
					spg: Math.round(avg((s) => s.stl) * 10) / 10,
				};
			})
		);

		return {
			visibility: filters.visibility,
			players: players
				.filter((p) => p.gp > 0)
				.sort((a, b) => b.ppg - a.ppg)
				.slice(0, limit),
		};
	}
);

export const getPublicPlayer = query(
	z.object({
		orgSlug: z.string(),
		seasonSlug: z.string(),
		playerId: idField,
	}),
	async ({ orgSlug, seasonSlug, playerId }) => {
		const filters = await getPublicSeasonFilters({ orgSlug, seasonSlug });
		if (!filters.visibility.publishPlayerStats) {
			notFound({ resource: 'player', id: playerId });
		}

		const player = await db.query.player.findFirst({
			where: { id: playerId },
			with: {
				team: { with: { division: true } },
				gameStats: {
					with: {
						game: {
							columns: {
								id: true,
								seasonId: true,
								status: true,
								name: true,
								completedAt: true,
								scheduledAt: true,
							},
						},
					},
				},
			},
		});

		const division = player?.team?.division;
		if (!player || !player.team || !division || division.seasonId !== filters.season.id) {
			notFound({ resource: 'player', id: playerId });
		}

		const derived = player.gameStats
			.filter(
				(s) =>
					s.game?.seasonId === filters.season.id &&
					s.game.status === 'completed' &&
					playerAppearedOnSheet(s)
			)
			.map((s) => derivePlayerGameStats(s as Parameters<typeof derivePlayerGameStats>[0]));
		const gp = derived.length;
		const avg = (pick: (s: (typeof derived)[number]) => number) =>
			gp ? Math.round((derived.reduce((a, s) => a + pick(s), 0) / gp) * 10) / 10 : 0;

		return {
			playerId: player.id,
			name: displayName(player.name, filters.visibility.showPlayerFullNames),
			jerseyNumber: player.jerseyNumber,
			teamName: player.team.name,
			teamSlug: player.team.slug,
			divisionName: division.name,
			divisionSlug: division.slug,
			gp,
			ppg: avg((s) => s.pts),
			rpg: avg((s) => s.reb),
			apg: avg((s) => s.ast),
			spg: avg((s) => s.stl),
		};
	}
);

export const getPublicStandings = query(
	z.object({
		orgSlug: z.string(),
		seasonSlug: z.string(),
		divisionSlug: z.string().optional(),
	}),
	async ({ orgSlug, seasonSlug, divisionSlug }) => {
		const filters = await getPublicSeasonFilters({ orgSlug, seasonSlug });
		if (!filters.visibility.publishStandings) {
			return { divisions: [] as PublicStandingDivision[], visibility: filters.visibility };
		}

		const divisions = divisionSlug
			? filters.divisions.filter((d) => d.slug === divisionSlug)
			: filters.divisions;

		const seasonGames = correctFalsePlayoffTypes(
			await db.query.game.findMany({
				where: { seasonId: filters.season.id, status: 'completed' },
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
			})
		);
		const scoredGames = seasonGames.flatMap((game) => {
			const homeTeamScore = game.homeTeamScore ?? 0;
			const awayTeamScore = game.awayTeamScore ?? 0;
			if (homeTeamScore === 0 && awayTeamScore === 0) return [];
			return [{ ...game, homeTeamScore, awayTeamScore }];
		});

		const result = divisions.map((div) => {
			const ranked = regularSeasonStandings(
				div.teams.map((team) => team.id),
				scoredGames
			);
			const teamById = new Map(div.teams.map((team) => [team.id, team]));
			const rows = ranked.flatMap((standing) => {
				const team = teamById.get(standing.teamId);
				if (!team) return [];
				return [
					{
						teamId: team.id,
						name: team.name,
						slug: team.slug,
						wins: standing.wins,
						losses: standing.losses,
						rank: standing.rank,
					},
				];
			});
			return { id: div.id, name: div.name, slug: div.slug, rows };
		});

		return { visibility: filters.visibility, divisions: result };
	}
);

export const getPublicGameBoxScore = query(
	z.object({
		orgSlug: z.string(),
		seasonSlug: z.string(),
		gameId: idField,
	}),
	async ({ orgSlug, seasonSlug, gameId }) => {
		const filters = await getPublicSeasonFilters({ orgSlug, seasonSlug });
		if (!filters.visibility.publishGameScores || !filters.visibility.publishPlayerStats) {
			notFound({ resource: 'game', id: gameId });
		}

		const box = await loadBoxScore(gameId);
		if (box.seasonId !== filters.season.id) {
			notFound({ resource: 'game', id: gameId });
		}

		const showFull = filters.visibility.showPlayerFullNames;
		const publishPlayers = (side: typeof box.homeTeam) => ({
			id: side.id,
			name: side.name,
			slug: side.slug,
			divisionSlug: side.divisionSlug,
			score: side.score,
			players: side.players.map((player) => ({
				playerId: player.playerId,
				name: displayName(player.name, showFull),
				jerseyNumber: player.jerseyNumber,
				pts: player.pts,
				pointsOnly: player.pointsOnly,
				reb: player.reb,
				ast: player.ast,
				stl: player.stl,
				blk: player.blk,
				tov: player.tov,
				oreb: player.oreb,
				fgm: player.fgm,
				fga: player.fga,
				fg3m: player.fg3m,
				fg3a: player.fg3a,
				ftm: player.ftm,
				fta: player.fta,
				gameRating: player.gameRating,
				ratingMeaning: player.ratingMeaning,
			})),
		});

		return {
			id: box.id,
			name: box.name,
			status: box.status,
			gameType: box.gameType,
			statsAvailable: box.statsAvailable,
			pointsOnly: box.pointsOnly,
			defaultLossSide: box.defaultLossSide,
			completedAt: box.completedAt,
			awayTeam: publishPlayers(box.awayTeam),
			homeTeam: publishPlayers(box.homeTeam),
		};
	}
);

export const getPublicGames = query(
	z.object({
		orgSlug: z.string().optional(),
		seasonSlug: z.string().optional(),
		divisionSlug: z.string().optional(),
		limit: z.number().int().min(1).max(50).default(20),
	}),
	async ({ orgSlug, seasonSlug, divisionSlug, limit }) => {
		const leagues = await listPublishedLeagues();
		const scoped = orgSlug ? leagues.filter((l) => l.slug === orgSlug) : leagues;

		const games: Array<{
			id: string;
			leagueName: string;
			leagueSlug: string;
			seasonSlug: string;
			awayName: string;
			homeName: string;
			awayScore: number | null;
			homeScore: number | null;
			status: string;
			gameType: string;
			statsAvailable: boolean;
			pointsOnly: boolean;
			defaultLossSide: string | null;
			at: Date | null;
			playerStatsPublic: boolean;
		}> = [];

		for (const league of scoped) {
			if (!league.visibility.publishGameScores) continue;
			let season = league.season;
			if (seasonSlug) {
				if (league.season?.slug === seasonSlug) {
					season = league.season;
				} else {
					const meta = await getPublicLeagueMeta({ orgSlug: league.slug });
					const match = meta.seasons.find((s) => s.slug === seasonSlug);
					season = match ? { id: match.id, name: match.name, slug: match.slug } : null;
				}
			}
			if (!season) continue;

			let divisionTeamIds: Set<string> | null = null;
			if (divisionSlug) {
				const seasonFilters = await getPublicSeasonFilters({
					orgSlug: league.slug,
					seasonSlug: season.slug,
				});
				const division = seasonFilters.divisions.find((d) => d.slug === divisionSlug);
				divisionTeamIds = new Set(division?.teams.map((t) => t.id) ?? []);
			}

			const rows = dedupeMatchups(
				correctFalsePlayoffTypes(
					await db.query.game.findMany({
						where: { seasonId: season.id },
						with: {
							homeTeam: { columns: { name: true } },
							awayTeam: { columns: { name: true } },
						},
						orderBy: { scheduledAt: 'desc' },
					})
				)
			);

			for (const g of rows) {
				if (
					divisionTeamIds &&
					!divisionTeamIds.has(g.homeTeamId) &&
					!divisionTeamIds.has(g.awayTeamId)
				) {
					continue;
				}
				games.push({
					id: g.id,
					leagueName: league.name,
					leagueSlug: league.slug,
					seasonSlug: season.slug,
					awayName: g.awayTeam?.name ?? 'Away',
					homeName: g.homeTeam?.name ?? 'Home',
					awayScore: league.visibility.publishGameScores ? g.awayTeamScore : null,
					homeScore: league.visibility.publishGameScores ? g.homeTeamScore : null,
					status: g.status,
					gameType: g.gameType,
					statsAvailable: g.statsAvailable,
					pointsOnly: g.pointsOnly,
					defaultLossSide: g.defaultLossSide,
					at: g.completedAt ?? g.scheduledAt,
					playerStatsPublic: league.visibility.publishPlayerStats,
				});
			}
		}

		return games.sort((a, b) => (b.at?.getTime() ?? 0) - (a.at?.getTime() ?? 0)).slice(0, limit);
	}
);

export const getPublicTeamStats = query(
	z.object({
		orgSlug: z.string(),
		seasonSlug: z.string(),
		divisionSlug: z.string().optional(),
	}),
	async ({ orgSlug, seasonSlug, divisionSlug }) => {
		const filters = await getPublicSeasonFilters({ orgSlug, seasonSlug });
		if (!filters.visibility.publishTeamStats) {
			return {
				teams: [] as Array<{
					teamId: string;
					name: string;
					slug: string;
					divisionName: string;
					divisionSlug: string;
					gp: number;
					ppg: number;
					oppPpg: number;
					diff: number;
				}>,
				visibility: filters.visibility,
			};
		}

		const divisions = divisionSlug
			? filters.divisions.filter((d) => d.slug === divisionSlug)
			: filters.divisions;

		const loadedGames = correctFalsePlayoffTypes(
			await db.query.game.findMany({
				where: { seasonId: filters.season.id, status: 'completed' },
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
			})
		);
		const participantIds = new Set<string>();
		for (const game of loadedGames) {
			participantIds.add(game.homeTeamId);
			participantIds.add(game.awayTeamId);
		}
		const games = regularSeasonGames(
			loadedGames.map((game) => ({
				...game,
				homeTeamScore: game.homeTeamScore ?? 0,
				awayTeamScore: game.awayTeamScore ?? 0,
			})),
			participantIds
		);

		const teams = divisions.flatMap((div) =>
			div.teams.map((team) => {
				let gp = 0;
				let pf = 0;
				let pa = 0;
				for (const g of games) {
					if (g.homeTeamId === team.id) {
						gp += 1;
						pf += g.homeTeamScore ?? 0;
						pa += g.awayTeamScore ?? 0;
					} else if (g.awayTeamId === team.id) {
						gp += 1;
						pf += g.awayTeamScore ?? 0;
						pa += g.homeTeamScore ?? 0;
					}
				}
				return {
					teamId: team.id,
					name: team.name,
					slug: team.slug,
					divisionName: div.name,
					divisionSlug: div.slug,
					gp,
					ppg: gp ? Math.round((pf / gp) * 10) / 10 : 0,
					oppPpg: gp ? Math.round((pa / gp) * 10) / 10 : 0,
					diff: gp ? Math.round(((pf - pa) / gp) * 10) / 10 : 0,
				};
			})
		);

		return {
			visibility: filters.visibility,
			teams: teams.sort((a, b) => b.ppg - a.ppg),
		};
	}
);

export const getLeagueVisibilitySettings = query(
	z.object({ organizationId: idField }),
	async ({ organizationId }) => visibilityForOrg(organizationId)
);

export const updateLeagueVisibility = form(leagueVisibilitySchema, async (data) => {
	if (!(await isUserAdmin()) && !(await isUserLeagueOrganizer())) {
		forbidden({ resource: 'organization' });
	}
	await requireUser();

	const org = await db.query.organization.findFirst({
		where: { id: data.organizationId, type: 'league' },
	});
	if (!org) notFound({ resource: 'organization' });

	const values = {
		organizationId: data.organizationId,
		isListed: !!data.isListed,
		publishStandings: !!data.publishStandings,
		publishGameScores: !!data.publishGameScores,
		publishTeamStats: !!data.publishTeamStats,
		publishPlayerStats: !!data.publishPlayerStats,
		showPlayerFullNames: !!data.showPlayerFullNames,
		showPlayerPhotos: !!data.showPlayerPhotos,
		showBirthdate: !!data.showBirthdate,
		publishDevelopmentReports: false,
		updatedAt: new Date(),
	};

	await db
		.insert(table.leagueVisibility)
		.values(values)
		.onConflictDoUpdate({
			target: table.leagueVisibility.organizationId,
			set: {
				isListed: values.isListed,
				publishStandings: values.publishStandings,
				publishGameScores: values.publishGameScores,
				publishTeamStats: values.publishTeamStats,
				publishPlayerStats: values.publishPlayerStats,
				showPlayerFullNames: values.showPlayerFullNames,
				showPlayerPhotos: values.showPlayerPhotos,
				showBirthdate: values.showBirthdate,
				publishDevelopmentReports: false,
				updatedAt: values.updatedAt,
			},
		});

	return { success: true };
});
