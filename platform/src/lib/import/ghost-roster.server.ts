import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { serverLogger } from '$lib/server/logger';
import { playerAppearedOnSheet } from '$lib/stats/player-game-stats';
import { eq, inArray } from 'drizzle-orm';
import { ghostRosterMatches, unusedImportPlayerIds, type RosterIdentity } from './ghost-roster';
import { isJerseyNumberTeamName } from './team-match';

export async function purgeGhostRosterPlayersForSeason(seasonId: string) {
	const divisions = await db.query.division.findMany({
		where: { seasonId },
		columns: { id: true },
		with: {
			teams: {
				columns: { id: true, name: true },
				with: {
					players: {
						columns: {
							id: true,
							name: true,
							jerseyNumber: true,
							teamId: true,
							userId: true,
						},
						with: {
							gameStats: true,
						},
					},
				},
			},
		},
	});

	let removed = 0;
	for (const division of divisions) {
		const identities: RosterIdentity[] = division.teams
			.filter((team) => !isJerseyNumberTeamName(team.name))
			.flatMap((team) =>
				team.players.map((player) => ({
					id: player.id,
					name: player.name,
					jerseyNumber: player.jerseyNumber,
					teamId: player.teamId,
					userId: player.userId,
					gamesPlayed: player.gameStats.filter((stat) => playerAppearedOnSheet(stat)).length,
				}))
			);

		const matches = ghostRosterMatches(identities);
		if (matches.length === 0) continue;

		await db.transaction(async (tx) => {
			for (const { ghostId, keeperId } of matches) {
				const [keeperNote] = await tx
					.select({ id: table.playerCoachNote.id })
					.from(table.playerCoachNote)
					.where(eq(table.playerCoachNote.playerId, keeperId))
					.limit(1);
				if (!keeperNote) {
					await tx
						.update(table.playerCoachNote)
						.set({ playerId: keeperId })
						.where(eq(table.playerCoachNote.playerId, ghostId));
				}

				await tx
					.update(table.playerFollower)
					.set({ playerId: keeperId })
					.where(eq(table.playerFollower.playerId, ghostId));

				const ghost = identities.find((player) => player.id === ghostId);
				const keeper = identities.find((player) => player.id === keeperId);
				if (ghost?.userId && !keeper?.userId) {
					await tx
						.update(table.player)
						.set({ userId: ghost.userId })
						.where(eq(table.player.id, keeperId));
				}

				await tx.delete(table.player).where(eq(table.player.id, ghostId));
				removed += 1;
			}
		});
	}

	if (removed > 0) {
		serverLogger.info('removed ghost roster players copied onto the wrong team', {
			seasonId,
			removed,
		});
	}
	return removed;
}

/** Reupload rewrites box scores but used to leave the leftover player rows in place. */
export async function purgePlayersWithNoGamesForDivision(divisionId: string) {
	const teams = await db.query.team.findMany({
		where: { divisionId },
		columns: { id: true, name: true },
		with: {
			players: {
				columns: { id: true, userId: true },
				with: {
					gameStats: true,
					followers: { columns: { id: true } },
				},
			},
		},
	});

	const ids = unusedImportPlayerIds(
		teams
			.filter((team) => !isJerseyNumberTeamName(team.name))
			.flatMap((team) =>
				team.players.map((player) => ({
					id: player.id,
					userId: player.userId,
					followerCount: player.followers.length,
					gamesPlayed: player.gameStats.filter((stat) => playerAppearedOnSheet(stat)).length,
				}))
			)
	);
	if (ids.length === 0) return 0;

	await db.delete(table.player).where(inArray(table.player.id, ids));
	serverLogger.info('removed leftover roster players with no games after import', {
		divisionId,
		removed: ids.length,
	});
	return ids.length;
}

export async function purgePlayersWithNoGamesForSeason(seasonId: string) {
	const divisions = await db.query.division.findMany({
		where: { seasonId },
		columns: { id: true },
	});
	let removed = 0;
	for (const division of divisions) {
		removed += await purgePlayersWithNoGamesForDivision(division.id);
	}
	return removed;
}
