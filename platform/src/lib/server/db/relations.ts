import { defineRelations } from 'drizzle-orm';
import * as schema from './schema';

export const relations = defineRelations(schema, (r) => ({
	season: {
		organization: r.one.organization({
			from: [r.season.organizationId],
			to: [r.organization.id],
		}),
		teams: r.many.team(),
		games: r.many.game(),
	},
	team: {
		season: r.one.season({
			from: [r.team.seasonId],
			to: [r.season.id],
		}),
		players: r.many.player(),
		coaches: r.many.coach(),
	},
	coach: {
		user: r.one.user({
			from: [r.coach.userId],
			to: [r.user.id],
			optional: true,
		}),
		team: r.one.team({
			from: [r.coach.teamId],
			to: [r.team.id],
		}),
	},
	game: {
		season: r.one.season({
			from: [r.game.seasonId],
			to: [r.season.id],
		}),
		homeTeam: r.one.team({
			from: [r.game.homeTeamId],
			to: [r.team.id],
		}),
		awayTeam: r.one.team({
			from: [r.game.awayTeamId],
			to: [r.team.id],
		}),
		playerStats: r.many.playerGameStat(),
	},
	player: {
		team: r.one.team({
			from: [r.player.teamId],
			to: [r.team.id],
		}),
		user: r.one.user({
			from: [r.player.userId],
			to: [r.user.id],
			optional: true,
		}),
		gameStats: r.many.playerGameStat(),
		followers: r.many.playerFollower(),
	},
	playerFollower: {
		user: r.one.user({
			from: [r.playerFollower.userId],
			to: [r.user.id],
		}),
		player: r.one.player({
			from: [r.playerFollower.playerId],
			to: [r.player.id],
		}),
	},
	playerGameStat: {
		player: r.one.player({
			from: [r.playerGameStat.playerId],
			to: [r.player.id],
		}),
		game: r.one.game({
			from: [r.playerGameStat.gameId],
			to: [r.game.id],
		}),
	},
	userOnboarding: {
		user: r.one.user({
			from: [r.userOnboarding.userId],
			to: [r.user.id],
		}),
	},
}));
