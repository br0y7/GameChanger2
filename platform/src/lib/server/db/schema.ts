// add custom schema if you need it here

import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { organization, team, user } from './auth-schema.ts';

export const season = sqliteTable('season', {
	id: text('id').primaryKey(),
	createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
	updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
		.$onUpdate(() => new Date())
		.notNull(),
	name: text('name').notNull(),
	leagueId: text('league_id')
		.notNull()
		.references(() => organization.id, { onDelete: 'cascade' }),
	status: text({ enum: ['active', 'completed'] }).default('active'),
});

export const game = sqliteTable('game', {
	id: text('id').primaryKey(),
	createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
	updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
		.$onUpdate(() => new Date())
		.notNull(),
	seasonId: text('season_id')
		.notNull()
		.references(() => organization.id, { onDelete: 'cascade' }),
	homeTeamId: text('home_team_id')
		.notNull()
		.references(() => team.id, { onDelete: 'cascade' }),
	awayTeamId: text('away_team_id')
		.notNull()
		.references(() => team.id, { onDelete: 'cascade' }),
	name: text('name'),
});

export const player = sqliteTable('player', {
	id: text('id').primaryKey(),
	createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
	updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
		.$onUpdate(() => new Date())
		.notNull(),
	name: text('name').notNull(),
	jerseyNumber: integer('jersey_number'),
	teamId: text('team_id').references(() => team.id, { onDelete: 'cascade' }),

	// connects a 'player' to a real user account, nullable since a player
	// can be made without it being connected to a real user yet.
	userId: text('user_id').references(() => user.id, { onDelete: 'set null' }),
});

export const playerGameStat = sqliteTable('player_game_stat', {
	id: text('id').primaryKey(),
	createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
	updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
		.$onUpdate(() => new Date())
		.notNull(),
	playerId: text('player_id').references(() => team.id, { onDelete: 'cascade' }),
	gameId: text('game_id').references(() => game.id, { onDelete: 'cascade' }),

	// raw stats per game no % since percentages can be derived from raw stats

	// minutes played
	min: real('min').default(0.0).notNull(),
	// field goals made & attempt
	fgm: integer('fgm').default(0).notNull(),
	fga: integer('fga').default(0).notNull(),
	// three points made & attempt
	fg3m: integer('fg3m').default(0).notNull(),
	fg3a: integer('fg3a').default(0).notNull(),
	// free throws made & attempt
	ftm: integer('ftm').default(0).notNull(),
	fta: integer('fta').default(0).notNull(),
	// offensive & defensive rebounds
	oreb: integer('oreb').default(0).notNull(),
	dreb: integer('dreb').default(0).notNull(),
	// assists
	ast: integer('ast').default(0).notNull(),
	// turnovers
	tov: integer('tov').default(0).notNull(),
	// steals
	stl: integer('stl').default(0).notNull(),
	// blocks
	blk: integer('blk').default(0).notNull(),
	// personal fouls
	pf: integer('pf').default(0).notNull(),
});

export * from './auth-schema.ts';
