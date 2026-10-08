import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { serverLogger } from '$lib/server/logger';
import { playerAppearedOnSheet } from '$lib/stats/player-game-stats';
import { eq } from 'drizzle-orm';
import { ghostRosterMatches, type RosterIdentity } from './ghost-roster';
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
