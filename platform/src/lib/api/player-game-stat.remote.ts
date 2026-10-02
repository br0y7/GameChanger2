import { query } from '$app/server';
import { isPlayerIdentityChange, relayDashboard } from '$lib/server/dashboard-sync.server';
import { idField } from '$lib/schemas/common';
import { db } from '$lib/server/db';
import { derivePlayerGameStats, playerAppearedOnSheet } from '$lib/stats/player-game-stats';
import { ensurePlayerGameRatings } from '$lib/server/game-rating.server';
import { count, eq } from 'drizzle-orm';
import { z } from 'zod';
import * as table from '$lib/server/db/schema';
import { seasonAveragesFromGames } from '$lib/stats/season-averages';

export const getPlayerGameStats = query(
	z.object({
		playerId: idField,
	}),
	async ({ playerId }) => {
		await ensurePlayerGameRatings(playerId);
		const rawStats = await db.query.playerGameStat.findMany({
			where: {
				playerId,
			},
			with: {
				game: true,
			},
		});

		return rawStats.filter(playerAppearedOnSheet).map(derivePlayerGameStats);
	}
);

export const getPlayerGameCount = query(z.object({ playerId: idField }), async ({ playerId }) => {
	const [gameCount] = await db
		.select({ count: count() })
		.from(table.playerGameStat)
		.where(eq(table.playerGameStat.playerId, playerId));

	return gameCount.count;
});

export const getPlayerSeasonAverages = query(
	z.object({ playerId: idField }),
	async ({ playerId }) => {
		const stats = await getPlayerGameStats({ playerId });
		return seasonAveragesFromGames(stats);
	}
);

const teamLeaderCategories = [
	{ key: 'points', label: 'Points' },
	{ key: 'rebounds', label: 'Rebounds' },
	{ key: 'assists', label: 'Assists' },
	{ key: 'fgPct', label: 'FG%' },
	{ key: 'fg3Pct', label: '3P%' },
] as const;

export type TeamLeaderCategory = (typeof teamLeaderCategories)[number]['key'];

async function getTeamPlayerSeasonAverages(teamId: string) {
	const players = await db.query.player.findMany({
		where: { teamId },
		with: { gameStats: true },
	});

	return players
		.map((player) => {
			const derived = player.gameStats.filter(playerAppearedOnSheet).map(derivePlayerGameStats);
			if (!derived.length) return null;

			return {
				playerId: player.id,
				name: player.name,
				jerseyNumber: player.jerseyNumber,
				averages: seasonAveragesFromGames(derived),
			};
		})
		.filter((player) => player !== null)
		.sort((a, b) => b.averages.points - a.averages.points);
}

export const getTeamPlayerAverages = query.live(z.object({ teamId: idField }), ({ teamId }) =>
	relayDashboard(
		async () => getTeamPlayerSeasonAverages(teamId),
		(_players, change) => isPlayerIdentityChange(change, { teamId })
	)
);

export const getTeamLeaders = query.live(z.object({ teamId: idField }), ({ teamId }) =>
	relayDashboard(
		async () => {
			const playerAverages = await getTeamPlayerSeasonAverages(teamId);

			return teamLeaderCategories.map(({ key, label }) => {
				const leader = playerAverages.reduce<(typeof playerAverages)[number] | null>(
					(best, player) => {
						if (!best || player.averages[key] > best.averages[key]) return player;
						return best;
					},
					null
				);

				return {
					key,
					label,
					player: leader
						? {
								id: leader.playerId,
								name: leader.name,
								jerseyNumber: leader.jerseyNumber,
								value: leader.averages[key],
								isPercent: key === 'fgPct' || key === 'fg3Pct',
							}
						: null,
				};
			});
		},
		(_leaders, change) => isPlayerIdentityChange(change, { teamId })
	)
);
