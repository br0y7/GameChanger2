import { query } from '$app/server';
import { idField } from '$lib/schemas/common';
import { COACH_STATUS } from '$lib/schemas/coach';
import { derivePlayerGameStats } from '$lib/stats/player-game-stats';
import { derivePlayerStats } from '$lib/stats/player-stats';
import { derivePlayerStrengths } from '$lib/player-analysis/player-strengths';
import { derivePlayerWeaknesses } from '$lib/player-analysis/player-weaknesses';
import { db } from '$lib/server/db';
import { forbidden, notFound } from '$lib/server/fail';
import { z } from 'zod';
import { isUserAdmin, requireUser } from './auth.remote';
import { isUserLeagueOrganizer } from './league.remote';
import type { PlayerGameStats, WithGame } from '$lib/schemas/player-game-stat';
import type { Game } from '$lib/server/db/schema';

async function assertCoachTeamView(teamId: string) {
	if ((await isUserAdmin()) || (await isUserLeagueOrganizer())) {
		return;
	}
	const user = await requireUser();
	const assignment = await db.query.coach.findFirst({
		where: {
			userId: user.id,
			teamId,
			status: COACH_STATUS.active,
		},
	});
	if (!assignment) {
		forbidden({ resource: 'team' });
	}
}

function sumBy(stats: PlayerGameStats[], pick: (s: PlayerGameStats) => number) {
	return stats.reduce((acc, s) => acc + pick(s), 0);
}

function pct(made: number, att: number) {
	return att > 0 ? made / att : 0;
}

function buildRow(
	player: { id: string; name: string; jerseyNumber: string },
	stats: WithGame<PlayerGameStats>[]
) {
	const gp = stats.length;
	const pts = sumBy(stats, (s) => s.pts);
	const reb = sumBy(stats, (s) => s.reb);
	const ast = sumBy(stats, (s) => s.ast);
	const stl = sumBy(stats, (s) => s.stl);
	const blk = sumBy(stats, (s) => s.blk);
	const tov = sumBy(stats, (s) => s.tov);
	const fgm = sumBy(stats, (s) => s.fgm);
	const fga = sumBy(stats, (s) => s.fga);
	const fg3m = sumBy(stats, (s) => s.fg3m);
	const fg3a = sumBy(stats, (s) => s.fg3a);
	const ftm = sumBy(stats, (s) => s.ftm);
	const fta = sumBy(stats, (s) => s.fta);

	return {
		playerId: player.id,
		name: player.name,
		jerseyNumber: player.jerseyNumber,
		gp,
		pts,
		ppg: gp ? pts / gp : 0,
		reb,
		rpg: gp ? reb / gp : 0,
		ast,
		apg: gp ? ast / gp : 0,
		stl,
		spg: gp ? stl / gp : 0,
		blk,
		bpg: gp ? blk / gp : 0,
		tov,
		topg: gp ? tov / gp : 0,
		fgPct: pct(fgm, fga),
		fg3Pct: pct(fg3m, fg3a),
		ftPct: pct(ftm, fta),
		updatedAt: stats.reduce<Date | null>((latest, s) => {
			const at = s.updatedAt ?? s.game?.completedAt ?? s.game?.scheduledAt ?? null;
			if (!at) return latest;
			if (!latest || at > latest) return at;
			return latest;
		}, null),
	};
}

function rankAmong(
	rows: { playerId: string; value: number }[],
	playerId: string
): number | null {
	if (!rows.length) return null;
	const sorted = [...rows].sort((a, b) => b.value - a.value);
	const idx = sorted.findIndex((r) => r.playerId === playerId);
	return idx >= 0 ? idx + 1 : null;
}

type GameLogStat = WithGame<PlayerGameStats> & {
	game: Game & {
		homeTeam: { id: string; name: string };
		awayTeam: { id: string; name: string };
	};
};

function formatGameLog(teamId: string, stats: GameLogStat[]) {
	return stats
		.map((stat) => {
			const game = stat.game;
			const isHome = game.homeTeamId === teamId;
			const opponent = isHome ? game.awayTeam : game.homeTeam;
			const teamScore = isHome ? (game.homeTeamScore ?? 0) : (game.awayTeamScore ?? 0);
			const oppScore = isHome ? (game.awayTeamScore ?? 0) : (game.homeTeamScore ?? 0);
			const result: 'W' | 'L' | 'T' | null =
				game.status === 'completed'
					? teamScore > oppScore
						? 'W'
						: teamScore < oppScore
							? 'L'
							: 'T'
					: null;
			const at = game.completedAt ?? game.scheduledAt;

			return {
				gameId: game.id,
				date: at,
				opponentName: opponent?.name ?? 'Opponent',
				result,
				teamScore,
				oppScore,
				pts: stat.pts,
				reb: stat.reb,
				ast: stat.ast,
				stl: stat.stl,
				blk: stat.blk,
				tov: stat.tov,
				fgPct: stat.fgPct,
			};
		})
		.sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0));
}

function trendArrow(recent: number, season: number): 'up' | 'down' | 'flat' {
	const delta = recent - season;
	if (Math.abs(delta) < 0.15) return 'flat';
	return delta > 0 ? 'up' : 'down';
}

export const getCoachTeamPlayerStats = query(z.object({ teamId: idField }), async ({ teamId }) => {
	await assertCoachTeamView(teamId);

	const players = await db.query.player.findMany({
		where: { teamId },
		with: {
			gameStats: {
				with: { game: true },
			},
		},
		orderBy: { name: 'asc' },
	});

	const rows = players
		.map((player) => {
			const derived = player.gameStats.map(derivePlayerGameStats);
			return buildRow(player, derived);
		})
		.sort((a, b) => b.ppg - a.ppg);

	const lastUpdated = rows.reduce<Date | null>((latest, row) => {
		if (!row.updatedAt) return latest;
		if (!latest || row.updatedAt > latest) return row.updatedAt;
		return latest;
	}, null);

	return { rows, lastUpdated };
});

export const getCoachPlayerDetail = query(
	z.object({
		teamId: idField,
		playerId: idField,
	}),
	async ({ teamId, playerId }) => {
		await assertCoachTeamView(teamId);

		const player = await db.query.player.findFirst({
			where: { id: playerId, teamId },
			with: {
				team: {
					with: {
						division: {
							with: {
								season: { with: { organization: true } },
							},
						},
					},
				},
				gameStats: {
					with: {
						game: {
							with: {
								homeTeam: { columns: { id: true, name: true } },
								awayTeam: { columns: { id: true, name: true } },
							},
						},
					},
				},
			},
		});

		if (!player) {
			notFound({ resource: 'player' });
		}

		const derived = player.gameStats
			.filter((s) => s.game)
			.map(derivePlayerGameStats) as GameLogStat[];

		const summary = buildRow(player, derived);
		const gameLog = formatGameLog(teamId, derived);

		const teamPlayers = await db.query.player.findMany({
			where: { teamId },
			with: { gameStats: true },
		});

		const teamRows = teamPlayers.map((p) => {
			const stats = p.gameStats.map(derivePlayerGameStats);
			return buildRow(p, stats);
		});

		const teamSize = teamRows.filter((r) => r.gp > 0).length || teamRows.length;

		const ranks = {
			scoring: rankAmong(
				teamRows.map((r) => ({ playerId: r.playerId, value: r.ppg })),
				playerId
			),
			rebounding: rankAmong(
				teamRows.map((r) => ({ playerId: r.playerId, value: r.rpg })),
				playerId
			),
			assists: rankAmong(
				teamRows.map((r) => ({ playerId: r.playerId, value: r.apg })),
				playerId
			),
			teamSize,
		};

		const last3 = gameLog.slice(0, 3);
		const last3Avg = (pick: (g: (typeof last3)[number]) => number) =>
			last3.length ? last3.reduce((a, g) => a + pick(g), 0) / last3.length : 0;

		const recentForm = {
			games: last3.length,
			ppg: last3Avg((g) => g.pts),
			rpg: last3Avg((g) => g.reb),
			apg: last3Avg((g) => g.ast),
			ppgTrend: trendArrow(last3Avg((g) => g.pts), summary.ppg),
			rpgTrend: trendArrow(last3Avg((g) => g.reb), summary.rpg),
			apgTrend: trendArrow(last3Avg((g) => g.ast), summary.apg),
			recentScoring: gameLog.slice(0, 5).map((g) => g.pts).reverse(),
		};

		const lastUpdated =
			derived.reduce<Date | null>((latest, s) => {
				const at = s.updatedAt ?? s.game?.completedAt ?? null;
				if (!at) return latest;
				if (!latest || at > latest) return at;
				return latest;
			}, null) ?? summary.updatedAt;

		const division = player.team?.division;
		const season = division?.season;
		const organization = season?.organization;

		return {
			player: {
				id: player.id,
				name: player.name,
				jerseyNumber: player.jerseyNumber,
				teamName: player.team?.name ?? 'Team',
			},
			statsLink:
				organization?.slug && season?.slug && division?.slug && player.team?.slug
					? {
							orgSlug: organization.slug,
							seasonSlug: season.slug,
							divisionSlug: division.slug,
							teamSlug: player.team.slug,
							jerseyNumber: player.jerseyNumber,
						}
					: null,
			summary,
			gameLog,
			ranks,
			recentForm,
			lastUpdated,
		};
	}
);

export const getCoachTeamDevelopment = query(z.object({ teamId: idField }), async ({ teamId }) => {
	await assertCoachTeamView(teamId);

	const players = await db.query.player.findMany({
		where: { teamId },
		with: { gameStats: true },
		orderBy: { name: 'asc' },
	});

	return players
		.map((player) => {
			const derived = player.gameStats.map(derivePlayerGameStats);
			if (!derived.length) {
				return {
					playerId: player.id,
					name: player.name,
					jerseyNumber: player.jerseyNumber,
					ppg: 0,
					rpg: 0,
					apg: 0,
					gp: 0,
					strengths: [] as string[],
					developmentAreas: [] as string[],
				};
			}

			const summary = buildRow(player, derived);
			const stats = derivePlayerStats(derived);
			const strengths = derivePlayerStrengths(stats);
			const weaknesses = derivePlayerWeaknesses(stats);

			return {
				playerId: player.id,
				name: player.name,
				jerseyNumber: player.jerseyNumber,
				ppg: summary.ppg,
				rpg: summary.rpg,
				apg: summary.apg,
				gp: summary.gp,
				strengths: strengths.slice(0, 3).map((s) => s.description),
				developmentAreas: weaknesses.slice(0, 3).map((w) => w.description),
			};
		})
		.filter((p) => p.gp > 0)
		.sort((a, b) => b.ppg - a.ppg);
});
