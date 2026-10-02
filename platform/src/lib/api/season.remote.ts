import { command, form, query } from '$app/server';
import { isPlayerIdentityChange, relayDashboard } from '$lib/server/dashboard-sync.server';
import { createSeasonSchema, seasonSchema, updateSeasonSchema } from '$lib/schemas/season';
import { db } from '$lib/server/db';
import { requireSession, requireUser } from './auth.remote';
import { serverLogger } from '$lib/server/logger';
import { advanceOnboardingStep } from './onboarding.server';
import { forbidden, internalNoId, notFound } from '$lib/server/fail';
import { getOnboarding } from './onboarding.remote';
import { invalid } from '@sveltejs/kit';
import { NEXT_ORGANIZER_ONBOARDING_STEP } from '$lib/onboarding/steps';
import * as table from '$lib/server/db/schema';
import { isConstraintError } from './errors.server';
import { seasonFormLabels } from '$lib/forms/labels';
import { idField, idOnlySchema } from '$lib/schemas/common';
import z from 'zod';
import { isUserLeagueOrganizer } from './league.remote';
import { getOrganization } from './organization.remote';
import { EmptyFilter, and, count, countDistinct, desc, eq, inArray, ne } from 'drizzle-orm';
import type { CrudAction, ResourceTarget } from '$lib/forms/types';
import { isJerseyNumberTeamName } from '$lib/import/team-match';
import { mergeDuplicateTeamsForSeason } from '$lib/import/duplicate-teams.server';
import { correctFalsePlayoffTypes } from '$lib/stats/matchup';
import { regularSeasonStandings } from '$lib/stats/standings';
import { derivePlayerGameStats, playerAppearedOnSheet } from '$lib/stats/player-game-stats';
import { seasonAveragesFromGames } from '$lib/stats/season-averages';

const includes = {
	organization: z.boolean().optional(),
	games: z.boolean().optional(),
	divisions: z.boolean().optional(),
};

export const getSeasons = query(
	z.object({ organizationId: idField.optional(), include: z.object(includes).default({}) }),
	async ({ organizationId, include }) => {
		return await db.query.season.findMany({
			where: organizationId ? { organizationId } : EmptyFilter,
			with: include,
			orderBy: { createdAt: 'asc' },
		});
	}
);

export const getSeason = query(
	z
		.union([
			z.object({ id: idField }),
			z.object({ organizationId: idField, slug: seasonSchema.slug }),
		])
		.and(z.object({ include: z.object(includes).default({}) })),
	async ({ include, ...filters }) => {
		const season = await db.query.season.findFirst({ where: filters, with: include });
		if (!season) {
			notFound(
				{ resource: 'season' },
				{ action: 'read', message: `season not found. ${JSON.stringify(filters)}` }
			);
		}
		return season;
	}
);

export const getCurrentSeason = query(
	z.object({
		organizationId: idField,
	}),
	async ({ organizationId }) => {
		return await db.query.season.findFirst({
			where: { organizationId, status: 'active' },
			orderBy: { createdAt: 'desc' },
		});
	}
);

async function assertPermissions(action: CrudAction, target: ResourceTarget) {
	if (!(await isUserLeagueOrganizer())) {
		forbidden(target);
	}

	const modifyingActions: CrudAction[] = ['update', 'delete'];

	if (!modifyingActions.includes(action)) {
		return;
	}

	if (!target.id) {
		internalNoId(target, { action });
	}

	// validates existence
	await getSeason({ id: target.id });
}

export const createSeason = form(createSeasonSchema, async (data, issue) => {
	const user = await requireUser();
	const { activeOrganizationId } = await requireSession();

	if (!activeOrganizationId) {
		serverLogger.error(`createSeason: no active organization`);
		return invalid('Something went wrong.');
	}

	const org = await getOrganization({ id: activeOrganizationId });

	await assertPermissions('create', { resource: 'season' });

	try {
		const [created] = await db
			.insert(table.season)
			.values({
				...data,
				organizationId: org.id,
			})
			.returning({ id: table.season.id });

		const onboarding = await getOnboarding({ userId: user.id });
		if (onboarding.status !== 'complete') {
			await advanceOnboardingStep(onboarding, NEXT_ORGANIZER_ONBOARDING_STEP);
		}

		void getSeasons({ organizationId: org.id }).refresh();

		serverLogger.info('created season', { id: created.id, userId: user.id });
	} catch (err) {
		if (isConstraintError(err, table.SEASON_UNIQUE_SLUG_PER_ORG_CONSTRAINT)) {
			return invalid(issue.slug(`${seasonFormLabels.slug} already taken.`));
		}

		serverLogger.error(err);

		return invalid('Something went wrong.');
	}
});

export const updateSeason = form(updateSeasonSchema, async ({ id, ...data }, issue) => {
	await assertPermissions('update', { resource: 'season', id });

	try {
		const [updated] = await db
			.update(table.season)
			.set(data)
			.where(eq(table.season.id, id))
			.returning({ id: table.season.id, organizationId: table.season.organizationId });

		const user = await requireUser();
		serverLogger.info('updated season', { id, userId: user.id });

		if (updated?.organizationId) {
			void getSeasons({ organizationId: updated.organizationId }).refresh();
			void getCurrentSeason({ organizationId: updated.organizationId }).refresh();
		}
	} catch (err) {
		if (isConstraintError(err, table.SEASON_UNIQUE_SLUG_PER_ORG_CONSTRAINT)) {
			return invalid(issue.slug(`${seasonFormLabels.slug} already taken.`));
		}

		serverLogger.error(err);

		return invalid('Something went wrong.');
	}
});

export const setActiveSeason = command(
	z.object({
		seasonId: idField,
		organizationId: idField,
	}),
	async ({ seasonId, organizationId }) => {
		await assertPermissions('update', { resource: 'season', id: seasonId });

		const season = await db.query.season.findFirst({
			where: { id: seasonId, organizationId },
			columns: { id: true, name: true },
		});

		if (!season) {
			notFound({ resource: 'season', id: seasonId });
		}

		await db
			.update(table.season)
			.set({ status: 'completed' })
			.where(and(eq(table.season.organizationId, organizationId), ne(table.season.id, seasonId)));

		await db.update(table.season).set({ status: 'active' }).where(eq(table.season.id, seasonId));

		const user = await requireUser();
		serverLogger.info('set active season', { seasonId, organizationId, userId: user.id });

		void getSeasons({ organizationId }).refresh();
		void getCurrentSeason({ organizationId }).refresh();

		return { success: true as const, seasonId, name: season.name };
	}
);

export const getSeasonStats = query(z.object({ seasonId: idField }), async ({ seasonId }) => {
	const [[counts], games, gamesWithStatRows] = await Promise.all([
		db
			.select({
				divisionCount: countDistinct(table.division.id),
				teamCount: countDistinct(table.team.id),
				playerCount: countDistinct(table.player.id),
			})
			.from(table.division)
			.leftJoin(table.team, eq(table.team.divisionId, table.division.id))
			.leftJoin(table.player, eq(table.player.teamId, table.team.id))
			.where(eq(table.division.seasonId, seasonId)),
		db.query.game.findMany({
			where: { seasonId },
			columns: {
				id: true,
				status: true,
				statsAvailable: true,
				statsStatus: true,
			},
		}),
		db
			.selectDistinct({ gameId: table.playerGameStat.gameId })
			.from(table.playerGameStat)
			.innerJoin(table.game, eq(table.playerGameStat.gameId, table.game.id))
			.where(eq(table.game.seasonId, seasonId)),
	]);

	const gameIdsWithStats = new Set(gamesWithStatRows.map((r) => r.gameId));
	const gameCount = games.length;
	const completedGames = games.filter((g) => g.status === 'completed');
	const completedCount = completedGames.length;
	const upcomingCount = games.filter((g) => g.status === 'upcoming').length;

	const hasStatsRecorded = (g: (typeof games)[number]) =>
		gameIdsWithStats.has(g.id) ||
		g.statsStatus === 'published' ||
		g.statsStatus === 'submitted' ||
		g.statsStatus === 'draft' ||
		g.statsAvailable === false;

	const statsSubmittedCount = completedGames.filter(hasStatsRecorded).length;
	const missingStatsCount = completedGames.filter((g) => !hasStatsRecorded(g)).length;
	const awaitingReviewCount = games.filter((g) => g.statsStatus === 'submitted').length;

	const gamesCompletedPct = gameCount > 0 ? Math.round((completedCount / gameCount) * 100) : 0;
	const statsSubmittedPct =
		completedCount > 0 ? Math.round((statsSubmittedCount / completedCount) * 100) : 0;

	return {
		divisionCount: counts.divisionCount,
		teamCount: counts.teamCount,
		playerCount: counts.playerCount,
		gameCount,
		completedCount,
		upcomingCount,
		statsSubmittedCount,
		missingStatsCount,
		awaitingReviewCount,
		gamesCompletedPct,
		statsSubmittedPct,
	};
});

export const getSeasonPlayerStats = query(
	z.object({
		seasonId: idField,
		divisionSlug: z.string().optional(),
		teamSlug: z.string().optional(),
	}),
	async ({ seasonId, divisionSlug, teamSlug }) => {
		await mergeDuplicateTeamsForSeason(seasonId);

		const divisions = await db.query.division.findMany({
			where: { seasonId },
			with: {
				teams: {
					columns: { id: true, name: true, slug: true },
					with: {
						players: {
							columns: { id: true, name: true, jerseyNumber: true },
							with: {
								gameStats: {
									with: { game: { columns: { id: true, seasonId: true, status: true } } },
								},
							},
						},
					},
				},
			},
			orderBy: { name: 'asc' },
		});

		const scoped = divisionSlug ? divisions.filter((d) => d.slug === divisionSlug) : divisions;

		return scoped
			.flatMap((division) =>
				division.teams
					.filter((team) => !isJerseyNumberTeamName(team.name))
					.filter((team) => (teamSlug ? team.slug === teamSlug : true))
					.flatMap((team) =>
						team.players.map((player) => {
							const derived = player.gameStats
								.filter(
									(stat) =>
										stat.game?.seasonId === seasonId &&
										stat.game.status === 'completed' &&
										playerAppearedOnSheet(stat)
								)
								.map((stat) =>
									derivePlayerGameStats(stat as Parameters<typeof derivePlayerGameStats>[0])
								);
							if (!derived.length) return null;
							const averages = seasonAveragesFromGames(derived);
							return {
								playerId: player.id,
								name: player.name,
								jerseyNumber: player.jerseyNumber,
								teamId: team.id,
								teamName: team.name,
								teamSlug: team.slug,
								divisionName: division.name,
								divisionSlug: division.slug,
								gp: averages.gamesPlayed,
								ppg: averages.points,
								rpg: averages.rebounds,
								apg: averages.assists,
								spg: averages.steals,
								bpg: averages.blocks,
								topg: averages.turnovers,
								fgPct: averages.fgPct,
								fg3Pct: averages.fg3Pct,
								ftPct: averages.ftPct,
							};
						})
					)
			)
			.filter((player) => player !== null)
			.sort((a, b) => b.ppg - a.ppg);
	}
);

export const getSeasonStandings = query(
	z.object({
		seasonId: idField,
		divisionSlug: z.string().optional(),
	}),
	async ({ seasonId, divisionSlug }) => {
		await mergeDuplicateTeamsForSeason(seasonId);

		const divisions = await db.query.division.findMany({
			where: { seasonId },
			with: { teams: { columns: { id: true, name: true, slug: true } } },
			orderBy: { name: 'asc' },
		});

		const scoped = (
			divisionSlug ? divisions.filter((d) => d.slug === divisionSlug) : divisions
		).map((division) => ({
			...division,
			teams: division.teams.filter((team) => !isJerseyNumberTeamName(team.name)),
		}));

		const seasonGames = correctFalsePlayoffTypes(
			await db.query.game.findMany({
				where: { seasonId, status: 'completed' },
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

		return scoped.map((division) => {
			const ranked = regularSeasonStandings(
				division.teams.map((team) => team.id),
				scoredGames
			);
			const teamById = new Map(division.teams.map((team) => [team.id, team]));
			return {
				id: division.id,
				name: division.name,
				slug: division.slug,
				rows: ranked.flatMap((standing) => {
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
				}),
			};
		});
	}
);

export const getLeagueRecentActivity = query.live(
	z.object({
		organizationId: idField,
		limit: z.number().int().min(1).max(20).default(8),
	}),
	({ organizationId, limit }) =>
		relayDashboard(
			async () => {
				const seasons = await db.query.season.findMany({
					where: { organizationId },
					columns: { id: true },
				});
				const seasonIds = seasons.map((s) => s.id);
				if (!seasonIds.length) {
					return [] as Array<{ id: string; at: Date; label: string }>;
				}

				const [games, playersAll, teamsAll] = await Promise.all([
					db.query.game.findMany({
						where: { seasonId: { in: seasonIds } },
						with: {
							homeTeam: { columns: { name: true } },
							awayTeam: { columns: { name: true } },
						},
						orderBy: { updatedAt: 'desc' },
						limit,
					}),
					db
						.select({
							id: table.player.id,
							name: table.player.name,
							jerseyNumber: table.player.jerseyNumber,
							updatedAt: table.player.updatedAt,
							teamName: table.team.name,
						})
						.from(table.player)
						.innerJoin(table.team, eq(table.player.teamId, table.team.id))
						.innerJoin(table.division, eq(table.team.divisionId, table.division.id))
						.where(inArray(table.division.seasonId, seasonIds))
						.orderBy(desc(table.player.updatedAt))
						.limit(limit),
					db
						.select({
							id: table.team.id,
							name: table.team.name,
							updatedAt: table.team.updatedAt,
						})
						.from(table.team)
						.innerJoin(table.division, eq(table.team.divisionId, table.division.id))
						.where(inArray(table.division.seasonId, seasonIds))
						.orderBy(desc(table.team.updatedAt))
						.limit(limit),
				]);

				return [
					...games.map((g) => ({
						id: `game-${g.id}`,
						at: g.updatedAt ?? g.completedAt ?? g.createdAt,
						label: `${g.awayTeam?.name ?? 'Away'} vs ${g.homeTeam?.name ?? 'Home'} stats updated`,
					})),
					...playersAll.map((p) => ({
						id: `player-${p.id}`,
						at: p.updatedAt,
						label: `#${p.jerseyNumber} ${p.name} (${p.teamName}) updated`,
					})),
					...teamsAll.map((t) => ({
						id: `team-${t.id}`,
						at: t.updatedAt,
						label: `${t.name} roster/team updated`,
					})),
				]
					.filter((e) => !!e.at)
					.sort((a, b) => b.at.getTime() - a.at.getTime())
					.slice(0, limit);
			},
			(_activity, change) => isPlayerIdentityChange(change, { organizationId })
		)
);

export const deleteSeason = form(idOnlySchema, async ({ id }) => {
	await assertPermissions('delete', { resource: 'season', id });

	await db.delete(table.season).where(eq(table.season.id, id));

	const user = await requireUser();
	serverLogger.info('deleted season', { id, userId: user.id });
});
