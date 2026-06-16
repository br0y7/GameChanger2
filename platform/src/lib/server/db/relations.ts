import { defineRelations } from 'drizzle-orm';
import * as schema from './schema';

export const relations = defineRelations(schema, (r) => ({
	season: {
		league: r.one.organization({
			from: [r.season.leagueId],
			to: [r.organization.id],
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
}));
