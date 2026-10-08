import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { serverLogger } from '$lib/server/logger';
import { isJerseyNumberTeamName, preferredTeamName, teamMatchKey } from './team-match';
import { slugify } from '$lib/utils/string';
import { dedupeMatchups } from '$lib/stats/matchup';
import { and, eq, inArray, notInArray, sql } from 'drizzle-orm';
import { purgeJerseyNumberTeamsForSeason } from './jersey-number-teams.server';
import { purgeGhostRosterPlayersForSeason } from './ghost-roster.server';

type TeamRow = {
	id: string;
	name: string;
	games: number;
	players: number;
};

async function mergeDuplicateTeams(divisionId: string) {
	const teams = await db.query.team.findMany({
		where: { divisionId },
		columns: { id: true, name: true },
		with: { players: { columns: { id: true } } },
	});
	if (teams.length < 2) return 0;

	const teamIds = teams.map((team) => team.id);
	const games = await db.query.game.findMany({
		where: {
			OR: [{ homeTeamId: { in: teamIds } }, { awayTeamId: { in: teamIds } }],
		},
		columns: { id: true, homeTeamId: true, awayTeamId: true },
	});

	const gameCount = new Map<string, number>();
	for (const game of games) {
		gameCount.set(game.homeTeamId, (gameCount.get(game.homeTeamId) ?? 0) + 1);
		if (game.awayTeamId !== game.homeTeamId) {
			gameCount.set(game.awayTeamId, (gameCount.get(game.awayTeamId) ?? 0) + 1);
		}
	}

	const rows: TeamRow[] = teams.map((team) => ({
		id: team.id,
		name: team.name,
		games: gameCount.get(team.id) ?? 0,
		players: team.players.length,
	}));

	const groups = new Map<string, TeamRow[]>();
	for (const team of rows) {
		if (isJerseyNumberTeamName(team.name)) continue;
		const key = teamMatchKey(team.name);
		if (!key) continue;
		const list = groups.get(key) ?? [];
		list.push(team);
		groups.set(key, list);
	}

	const merges = [...groups.values()].filter((group) => group.length > 1);
	if (merges.length === 0) return 0;

	let removed = 0;
	await db.transaction(async (tx) => {
		for (const group of merges) {
			const ranked = [...group].sort(
				(a, b) =>
					b.games - a.games ||
					b.players - a.players ||
					Number(/^team\s+/i.test(a.name)) - Number(/^team\s+/i.test(b.name)) ||
					a.name.length - b.name.length
			);
			const keeper = ranked[0]!;
			const duplicates = ranked.slice(1);
			const name = preferredTeamName(group.map((team) => team.name));
			const slug = slugify(name);

			for (const duplicate of duplicates) {
				await tx
					.update(table.game)
					.set({ homeTeamId: keeper.id })
					.where(eq(table.game.homeTeamId, duplicate.id));
				await tx
					.update(table.game)
					.set({ awayTeamId: keeper.id })
					.where(eq(table.game.awayTeamId, duplicate.id));
				await tx
					.update(table.coach)
					.set({ teamId: keeper.id })
					.where(eq(table.coach.teamId, duplicate.id));

				const dupPlayers = await tx.query.player.findMany({
					where: { teamId: duplicate.id },
					columns: { id: true, jerseyNumber: true },
				});

				for (const player of dupPlayers) {
					const existing = await tx.query.player.findFirst({
						where: { teamId: keeper.id, jerseyNumber: player.jerseyNumber },
						columns: { id: true },
					});

					if (!existing) {
						await tx
							.update(table.player)
							.set({ teamId: keeper.id })
							.where(eq(table.player.id, player.id));
						continue;
					}

					const existingGameIds = (
						await tx
							.select({ gameId: table.playerGameStat.gameId })
							.from(table.playerGameStat)
							.where(eq(table.playerGameStat.playerId, existing.id))
					).map((row) => row.gameId);

					const moveWhere =
						existingGameIds.length > 0
							? and(
									eq(table.playerGameStat.playerId, player.id),
									notInArray(table.playerGameStat.gameId, existingGameIds)
								)
							: eq(table.playerGameStat.playerId, player.id);

					await tx.update(table.playerGameStat).set({ playerId: existing.id }).where(moveWhere);
					await tx.delete(table.playerGameStat).where(eq(table.playerGameStat.playerId, player.id));

					const [keeperNote] = await tx
						.select({ id: table.playerCoachNote.id })
						.from(table.playerCoachNote)
						.where(eq(table.playerCoachNote.playerId, existing.id))
						.limit(1);
					if (!keeperNote) {
						await tx
							.update(table.playerCoachNote)
							.set({ playerId: existing.id })
							.where(eq(table.playerCoachNote.playerId, player.id));
					}

					await tx
						.update(table.playerFollower)
						.set({ playerId: existing.id })
						.where(eq(table.playerFollower.playerId, player.id));
					await tx.delete(table.player).where(eq(table.player.id, player.id));
				}

				await tx.delete(table.team).where(eq(table.team.id, duplicate.id));
				removed += 1;
			}

			await tx.update(table.team).set({ name, slug }).where(eq(table.team.id, keeper.id));
		}
	});

	serverLogger.info('merged duplicate teams', {
		divisionId,
		removed,
		names: merges.map((group) => group.map((team) => team.name)),
	});
	return removed;
}

async function collapseDuplicateGames(seasonId: string) {
	await db
		.delete(table.game)
		.where(
			and(
				eq(table.game.seasonId, seasonId),
				sql`${table.game.homeTeamId} = ${table.game.awayTeamId}`
			)
		);

	const games = await db.query.game.findMany({
		where: { seasonId },
		columns: {
			id: true,
			homeTeamId: true,
			awayTeamId: true,
			gameType: true,
			status: true,
			statsAvailable: true,
			homeTeamScore: true,
			awayTeamScore: true,
			completedAt: true,
			scheduledAt: true,
		},
	});
	const kept = new Set(dedupeMatchups(games).map((game) => game.id));
	const extras = games.filter((game) => !kept.has(game.id)).map((game) => game.id);
	if (extras.length === 0) return 0;

	await db.delete(table.game).where(inArray(table.game.id, extras));
	serverLogger.info('removed duplicate matchup listings after a team merge', {
		seasonId,
		removed: extras.length,
	});
	return extras.length;
}

async function retitleSeasonGames(seasonId: string) {
	const games = await db.query.game.findMany({
		where: { seasonId },
		columns: { id: true, name: true },
		with: {
			homeTeam: { columns: { name: true } },
			awayTeam: { columns: { name: true } },
		},
	});

	for (const game of games) {
		if (!game.homeTeam || !game.awayTeam) continue;
		const base = `${game.homeTeam.name} vs ${game.awayTeam.name}`;
		const suffix = game.name.match(/\s*\([^)]*\)\s*$/)?.[0] ?? '';
		const next = suffix ? `${base}${suffix.startsWith(' ') ? suffix : ` ${suffix}`}` : base;
		if (game.name !== next) {
			await db.update(table.game).set({ name: next }).where(eq(table.game.id, game.id));
		}
	}
}

export async function mergeDuplicateTeamsForSeason(seasonId: string) {
	await purgeJerseyNumberTeamsForSeason(seasonId);

	const divisions = await db.query.division.findMany({
		where: { seasonId },
		columns: { id: true },
	});
	let removed = 0;
	for (const division of divisions) {
		removed += await mergeDuplicateTeams(division.id);
	}
	if (removed > 0) {
		await collapseDuplicateGames(seasonId);
		await retitleSeasonGames(seasonId);
	}
	await purgeGhostRosterPlayersForSeason(seasonId);
	return removed;
}
