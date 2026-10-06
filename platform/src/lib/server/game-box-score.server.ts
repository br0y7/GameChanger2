import { db } from '$lib/server/db';
import { notFound } from '$lib/server/fail';
import { derivePlayerGameStats, playerAppearedOnSheet } from '$lib/stats/player-game-stats';
import { ratingMeaning } from '$lib/stats/game-rating';
import { decideMvp } from '$lib/stats/player-of-the-game';
import { ensureGameBoxRatings } from '$lib/server/game-rating.server';
import { correctFalsePlayoffTypes } from '$lib/stats/matchup';
import type { RawPlayerGameStats } from '$lib/server/db/schema';

type StatWithPlayer = RawPlayerGameStats & {
	player?: {
		id: string;
		name: string;
		jerseyNumber: string;
		teamId: string;
	} | null;
};

function playerRowsForTeam(playerStats: StatWithPlayer[], teamId: string) {
	return playerStats
		.filter((stat) => stat.player?.teamId === teamId && playerAppearedOnSheet(stat))
		.map((stat) => {
			const derived = derivePlayerGameStats(stat);
			return {
				playerId: derived.playerId,
				name: stat.player?.name ?? 'Unknown',
				jerseyNumber: stat.player?.jerseyNumber ?? '',
				teamId,
				pts: derived.pts,
				pointsOnly: derived.pointsOnly,
				reb: derived.reb,
				ast: derived.ast,
				stl: derived.stl,
				blk: derived.blk,
				tov: derived.tov,
				fgm: derived.fgm,
				fga: derived.fga,
				fg3m: derived.fg3m,
				fg3a: derived.fg3a,
				ftm: derived.ftm,
				fta: derived.fta,
				fgPct: derived.fgPct,
				fg3Pct: derived.fg3Pct,
				ftPct: derived.ftPct,
				eff: derived.eff,
				oreb: derived.oreb,
				dreb: derived.dreb,
				pf: derived.pf,
				gameRating: derived.gameRating,
				ratingMeaning: derived.gameRating == null ? null : ratingMeaning(derived.gameRating),
				ratingBreakdown: derived.ratingBreakdown,
				impactScore: derived.impactScore,
				ratingPercentile: derived.ratingPercentile,
				contextBonus: derived.contextBonus,
			};
		})
		.sort((a, b) => b.pts - a.pts);
}

type BoxPlayer = ReturnType<typeof playerRowsForTeam>[number];

function mvpCard(
	player: BoxPlayer,
	teams: {
		homeTeamId: string;
		awayTeamId: string;
		homeTeam: { name: string; slug: string; division?: { slug: string } | null };
		awayTeam: { name: string; slug: string; division?: { slug: string } | null };
	}
) {
	const team =
		player.teamId === teams.homeTeamId
			? teams.homeTeam
			: player.teamId === teams.awayTeamId
				? teams.awayTeam
				: null;
	return {
		playerId: player.playerId,
		name: player.name,
		jerseyNumber: player.jerseyNumber,
		pts: player.pts,
		reb: player.reb,
		ast: player.ast,
		stl: player.stl,
		gameRating: player.gameRating,
		ratingMeaning: player.gameRating == null ? null : ratingMeaning(player.gameRating),
		teamId: player.teamId,
		teamName: team?.name ?? '',
		teamSlug: team?.slug ?? '',
		divisionSlug: team?.division?.slug ?? '',
	};
}

export async function loadBoxScore(gameId: string) {
	await ensureGameBoxRatings(gameId);
	const game = await db.query.game.findFirst({
		where: { id: gameId },
		with: {
			homeTeam: { with: { division: { columns: { id: true, slug: true } } } },
			awayTeam: { with: { division: { columns: { id: true, slug: true } } } },
			playerStats: {
				with: {
					player: true,
				},
			},
		},
	});

	if (!game) {
		notFound({ resource: 'game', id: gameId });
	}

	if (!game.homeTeam || !game.awayTeam) {
		notFound({ resource: 'game', id: gameId }, { message: 'Game is missing home or away team' });
	}

	const homeScore = game.homeTeamScore ?? 0;
	const awayScore = game.awayTeamScore ?? 0;

	const homePlayers = playerRowsForTeam(game.playerStats, game.homeTeamId);
	const awayPlayers = playerRowsForTeam(game.playerStats, game.awayTeamId);
	const mvpDecision = decideMvp([...homePlayers, ...awayPlayers]);
	const mvp =
		mvpDecision.kind === 'none'
			? null
			: {
					kind: mvpDecision.kind,
					players: mvpDecision.players.map((player) => mvpCard(player, game)),
				};
	const playerOfTheGame = mvp?.players[0] ?? null;

	const seasonMeetings = await db.query.game.findMany({
		where: { seasonId: game.seasonId },
		columns: {
			id: true,
			homeTeamId: true,
			awayTeamId: true,
			gameType: true,
			completedAt: true,
			scheduledAt: true,
		},
	});
	const gameType =
		correctFalsePlayoffTypes(seasonMeetings).find((row) => row.id === game.id)?.gameType ??
		game.gameType;

	return {
		id: game.id,
		seasonId: game.seasonId,
		name: game.name,
		status: game.status,
		gameType,
		statsAvailable: game.statsAvailable,
		pointsOnly: game.pointsOnly,
		defaultLossSide: game.defaultLossSide,
		completedAt: game.completedAt,
		scheduledAt: game.scheduledAt,
		mvp,
		playerOfTheGame,
		homeTeam: {
			id: game.homeTeam.id,
			name: game.homeTeam.name,
			slug: game.homeTeam.slug,
			divisionId: game.homeTeam.divisionId,
			divisionSlug: game.homeTeam.division?.slug ?? '',
			score: homeScore,
			players: homePlayers,
		},
		awayTeam: {
			id: game.awayTeam.id,
			name: game.awayTeam.name,
			slug: game.awayTeam.slug,
			divisionId: game.awayTeam.divisionId,
			divisionSlug: game.awayTeam.division?.slug ?? '',
			score: awayScore,
			players: awayPlayers,
		},
	};
}
