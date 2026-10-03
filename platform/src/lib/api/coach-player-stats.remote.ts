import { query } from '$app/server';
import {
	isPlayerIdentityChange,
	isScheduleChange,
	relayDashboard,
	type PlayerDisplayChange,
} from '$lib/server/dashboard-sync.server';
import { idField } from '$lib/schemas/common';
import { COACH_STATUS } from '$lib/schemas/coach';
import { derivePlayerGameStats, playerAppearedOnSheet } from '$lib/stats/player-game-stats';
import { shootingPercentageBy } from '$lib/utils/collection';
import { dedupeByMatchup, correctFalsePlayoffTypes } from '$lib/stats/matchup';
import {
	averageGameRating,
	ratingMeaning,
	trendDelta,
	trendVersusAverage,
} from '$lib/stats/game-rating';
import { ensureTeamGameRatings } from '$lib/server/game-rating.server';
import { playerImprovementFromGames } from '$lib/player-analysis/player-improvement';
import { db } from '$lib/server/db';
import { forbidden, notFound } from '$lib/server/fail';
import { z } from 'zod';
import { isUserAdmin, requireUser } from './auth.remote';
import { isUserLeagueOrganizer } from './league.remote';
import { demoCanViewTeam } from '$lib/server/demo-access.server';
import type { PlayerGameStats, WithGame } from '$lib/schemas/player-game-stat';
import type { Game } from '$lib/server/db/schema';

function coachViewChange(
	change: PlayerDisplayChange,
	scope: { teamId?: string; playerId?: string }
) {
	return (
		isPlayerIdentityChange(change, scope) || isScheduleChange(change, { teamId: scope.teamId })
	);
}

async function assertCoachTeamView(teamId: string) {
	if ((await isUserAdmin()) || (await isUserLeagueOrganizer())) {
		return;
	}
	if (await demoCanViewTeam(teamId)) {
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
		fgPct: shootingPercentageBy(
			stats,
			(s) => s.fgm,
			(s) => s.fga
		),
		fg3Pct: shootingPercentageBy(
			stats,
			(s) => s.fg3m,
			(s) => s.fg3a
		),
		ftPct: shootingPercentageBy(
			stats,
			(s) => s.ftm,
			(s) => s.fta
		),
		updatedAt: stats.reduce<Date | null>((latest, s) => {
			const at = s.updatedAt ?? s.game?.completedAt ?? s.game?.scheduledAt ?? null;
			if (!at) return latest;
			if (!latest || at > latest) return at;
			return latest;
		}, null),
	};
}

function rankAmong(rows: { playerId: string; value: number }[], playerId: string): number | null {
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
	const meetings = correctFalsePlayoffTypes([
		...new Map(
			stats.filter((stat) => stat.game).map((stat) => [stat.game.id, stat.game] as const)
		).values(),
	]);
	const typeById = new Map(meetings.map((game) => [game.id, game.gameType]));

	return stats
		.filter((stat) => playerAppearedOnSheet(stat))
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
				gameType: typeById.get(game.id) ?? game.gameType,
				pts: stat.pts,
				pointsOnly: stat.pointsOnly,
				reb: stat.reb,
				ast: stat.ast,
				stl: stat.stl,
				blk: stat.blk,
				tov: stat.tov,
				oreb: stat.oreb,
				fgPct: stat.fgPct,
				gameRating: stat.gameRating,
				meaning: stat.gameRating == null ? null : ratingMeaning(stat.gameRating),
				breakdown: stat.ratingBreakdown,
				impactScore: stat.impactScore,
				percentile: stat.ratingPercentile,
				contextBonus: stat.contextBonus,
			};
		})
		.sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0));
}

function trendArrow(recent: number, season: number): 'up' | 'down' | 'flat' {
	const delta = recent - season;
	if (Math.abs(delta) < 0.15) return 'flat';
	return delta > 0 ? 'up' : 'down';
}

export const getCoachTeamPlayerStats = query.live(z.object({ teamId: idField }), ({ teamId }) =>
	relayDashboard(
		async () => {
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
					const derived = dedupeByMatchup(
						player.gameStats
							.filter((s) => s.game && playerAppearedOnSheet(s))
							.map(derivePlayerGameStats),
						(stat) => stat.game
					);
					return buildRow(player, derived);
				})
				.sort((a, b) => b.ppg - a.ppg);

			const lastUpdated = rows.reduce<Date | null>((latest, row) => {
				if (!row.updatedAt) return latest;
				if (!latest || row.updatedAt > latest) return row.updatedAt;
				return latest;
			}, null);

			return { rows, lastUpdated };
		},
		(_stats, change) => coachViewChange(change, { teamId })
	)
);

export const getCoachPlayerDetail = query.live(
	z.object({
		teamId: idField,
		playerId: idField,
	}),
	({ teamId, playerId }) =>
		relayDashboard(
			async () => {
				await assertCoachTeamView(teamId);
				await ensureTeamGameRatings(teamId);

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

				const derived = dedupeByMatchup(
					player.gameStats
						.filter((s) => s.game && playerAppearedOnSheet(s))
						.map(derivePlayerGameStats) as GameLogStat[],
					(stat) => stat.game
				);

				const summary = buildRow(player, derived);
				const gameLog = formatGameLog(teamId, derived);
				const seasonAverageRating = averageGameRating(
					derived.flatMap((stat) => (stat.gameRating == null ? [] : [stat.gameRating]))
				);

				const teamPlayers = await db.query.player.findMany({
					where: { teamId },
					with: { gameStats: { with: { game: true } } },
				});

				const teamRows = teamPlayers.map((p) => {
					const stats = dedupeByMatchup(
						p.gameStats
							.filter((s) => s.game && playerAppearedOnSheet(s))
							.map(derivePlayerGameStats),
						(stat) => stat.game
					);
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
					ppgTrend: trendArrow(
						last3Avg((g) => g.pts),
						summary.ppg
					),
					rpgTrend: trendArrow(
						last3Avg((g) => g.reb),
						summary.rpg
					),
					apgTrend: trendArrow(
						last3Avg((g) => g.ast),
						summary.apg
					),
					recentScoring: gameLog
						.slice(0, 5)
						.map((g) => g.pts)
						.reverse(),
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
					summary: { ...summary, averageGameRating: seasonAverageRating },
					gameLog,
					ranks,
					recentForm,
					lastUpdated,
				};
			},
			(_detail, change) => coachViewChange(change, { teamId, playerId })
		)
);

export const getCoachTeamDevelopment = query.live(z.object({ teamId: idField }), ({ teamId }) =>
	relayDashboard(
		async () => {
			await assertCoachTeamView(teamId);

			const players = await db.query.player.findMany({
				where: { teamId },
				with: { gameStats: { with: { game: true } } },
				orderBy: { name: 'asc' },
			});

			return players
				.map((player) => {
					const derived = dedupeByMatchup(
						player.gameStats
							.filter((s) => s.game && playerAppearedOnSheet(s))
							.map(derivePlayerGameStats),
						(stat) => stat.game
					);
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
					const improvement = playerImprovementFromGames(derived);

					return {
						playerId: player.id,
						name: player.name,
						jerseyNumber: player.jerseyNumber,
						ppg: summary.ppg,
						rpg: summary.rpg,
						apg: summary.apg,
						gp: summary.gp,
						strengths: improvement.strengths.slice(0, 3).map((s) => s.description),
						developmentAreas: improvement.weaknesses.slice(0, 3).map((w) => w.description),
					};
				})
				.filter((p) => p.gp > 0)
				.sort((a, b) => b.ppg - a.ppg);
		},
		(_rows, change) => coachViewChange(change, { teamId })
	)
);

export const getCoachLatestGameRatings = query.live(z.object({ teamId: idField }), ({ teamId }) =>
	relayDashboard(
		async () => {
			await assertCoachTeamView(teamId);
			await ensureTeamGameRatings(teamId);

			const players = await db.query.player.findMany({
				where: { teamId },
				with: {
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
				orderBy: { name: 'asc' },
			});

			let latestGame: {
				id: string;
				at: number;
				opponentName: string;
				teamScore: number;
				oppScore: number;
			} | null = null;

			for (const player of players) {
				for (const stat of player.gameStats) {
					const game = stat.game;
					if (!game || game.status !== 'completed') continue;
					const at = (game.completedAt ?? game.scheduledAt)?.getTime() ?? 0;
					if (latestGame && at <= latestGame.at) continue;
					const isHome = game.homeTeamId === teamId;
					latestGame = {
						id: game.id,
						at,
						opponentName: (isHome ? game.awayTeam?.name : game.homeTeam?.name) ?? 'Opponent',
						teamScore: isHome ? (game.homeTeamScore ?? 0) : (game.awayTeamScore ?? 0),
						oppScore: isHome ? (game.awayTeamScore ?? 0) : (game.homeTeamScore ?? 0),
					};
				}
			}

			if (!latestGame) return null;

			const roster = players
				.map((player) => {
					const derived = player.gameStats.filter((stat) => stat.game).map(derivePlayerGameStats);
					const seasonAverage = averageGameRating(
						derived.flatMap((stat) => (stat.gameRating == null ? [] : [stat.gameRating]))
					);
					const gameStat = derived.find((stat) => stat.game?.id === latestGame!.id);
					if (!gameStat || gameStat.gameRating == null) return null;
					const delta = trendDelta(gameStat.gameRating, seasonAverage);
					return {
						playerId: player.id,
						name: player.name,
						jerseyNumber: player.jerseyNumber,
						pts: gameStat.pts,
						reb: gameStat.reb,
						ast: gameStat.ast,
						stl: gameStat.stl,
						blk: gameStat.blk,
						tov: gameStat.tov,
						oreb: gameStat.oreb,
						gameRating: gameStat.gameRating,
						meaning: ratingMeaning(gameStat.gameRating),
						breakdown: gameStat.ratingBreakdown,
						seasonAverage,
						trend: trendVersusAverage(gameStat.gameRating, seasonAverage),
						delta,
					};
				})
				.filter((row) => row != null)
				.sort((a, b) => b.gameRating - a.gameRating);

			return {
				gameId: latestGame.id,
				opponentName: latestGame.opponentName,
				teamScore: latestGame.teamScore,
				oppScore: latestGame.oppScore,
				players: roster,
			};
		},
		(_ratings, change) => coachViewChange(change, { teamId })
	)
);
