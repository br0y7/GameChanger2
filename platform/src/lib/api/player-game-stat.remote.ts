import { query } from '$app/server';
import { idField } from '$lib/schemas/common';
import { db } from '$lib/server/db';
import { derivePlayerGameStats } from '$lib/stats/player-game-stats';
import { count, eq } from 'drizzle-orm';
import { z } from 'zod';
import * as table from '$lib/server/db/schema';
import { averageBy, percentageBy } from '$lib/utils/collection';
import type { PlayerGameStats } from '$lib/schemas/player-game-stat';

function seasonAveragesFromGames(stats: PlayerGameStats[]) {
	const fgPct = percentageBy(
		stats,
		(stat) => stat.fgm,
		(stat) => stat.fga
	);
	const fg3Pct = percentageBy(
		stats,
		(stat) => stat.fg3m,
		(stat) => stat.fg3a
	);
	const ftPct = percentageBy(
		stats,
		(stat) => stat.ftm,
		(stat) => stat.fta
	);

	return {
		gamesPlayed: stats.length,
		points: averageBy(stats, (stat) => stat.pts) ?? 0,
		rebounds: averageBy(stats, (stat) => stat.reb) ?? 0,
		assists: averageBy(stats, (stat) => stat.ast) ?? 0,
		steals: averageBy(stats, (stat) => stat.stl) ?? 0,
		blocks: averageBy(stats, (stat) => stat.blk) ?? 0,
		turnovers: averageBy(stats, (stat) => stat.tov) ?? 0,
		fgPct,
		fg3Pct,
		ftPct,
		shootingPercentage: fgPct,
	};
}

export const getPlayerGameStats = query(
	z.object({
		playerId: idField,
	}),
	async ({ playerId }) => {
		const rawStats = await db.query.playerGameStat.findMany({
			where: {
				playerId,
			},
			with: {
				game: true,
			},
		});

		return rawStats.map(derivePlayerGameStats);
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
			const derived = player.gameStats.map(derivePlayerGameStats);
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

export const getTeamPlayerAverages = query(z.object({ teamId: idField }), async ({ teamId }) => {
	return getTeamPlayerSeasonAverages(teamId);
});

export const getTeamLeaders = query(z.object({ teamId: idField }), async ({ teamId }) => {
	const playerAverages = await getTeamPlayerSeasonAverages(teamId);

	return teamLeaderCategories.map(({ key, label }) => {
		const leader = playerAverages.reduce<(typeof playerAverages)[number] | null>((best, player) => {
			if (!best || player.averages[key] > best.averages[key]) return player;
			return best;
		}, null);

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
});
