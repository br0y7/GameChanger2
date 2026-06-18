// add custom schema if you need it here

import { index, integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { organization, user } from './auth-schema.ts';
import { uuidv7 } from 'uuidv7';

const baseFields = {
	id: text('id').primaryKey().$defaultFn(uuidv7),
	createdAt: integer('created_at', { mode: 'timestamp_ms' })
		.$defaultFn(() => new Date())
		.notNull(),
	updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
		.$onUpdateFn(() => new Date())
		.notNull(),
};

export const season = sqliteTable(
	'season',
	{
		...baseFields,
		name: text('name').notNull(),
		organizationId: text('organization_id')
			.notNull()
			.references(() => organization.id, { onDelete: 'cascade' }),
		status: text({ enum: ['active', 'completed'] }).default('active'),
	},
	(table) => [index('season_organizationId_idx').on(table.organizationId)]
);

export const team = sqliteTable(
	'team',
	{
		...baseFields,
		name: text('name').notNull(),
		slug: text('slug').notNull().unique(),
		seasonId: text('season_id')
			.notNull()
			.references(() => season.id, { onDelete: 'cascade' }),
	},
	(table) => [
		index('team_seasonId_idx').on(table.seasonId),
		uniqueIndex('team_slug_uidx').on(table.seasonId, table.slug),
	]
);

export const coach = sqliteTable(
	'coach',
	{
		...baseFields,
		name: text('name').notNull(),
		// nullable, organizer creates a record then invites a coach
		userId: text('user_id').references(() => user.id, { onDelete: 'set null' }),
		teamId: text('team_id')
			.notNull()
			.references(() => team.id, { onDelete: 'cascade' }),
		// potentially could add 'type/role' if you want to disambiguate head, assistant coach
	},
	(table) => [
		index('coach_userId_idx').on(table.userId),
		index('coach_teamId_idx').on(table.teamId),
	]
);

export const game = sqliteTable(
	'game',
	{
		...baseFields,
		seasonId: text('season_id')
			.notNull()
			.references(() => organization.id, { onDelete: 'cascade' }),
		homeTeamId: text('home_team_id')
			.notNull()
			.references(() => team.id, { onDelete: 'cascade' }),
		awayTeamId: text('away_team_id')
			.notNull()
			.references(() => team.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		venue: text('venue'),

		// filled after completing the game for caching reasons (less db lookup)
		homeTeamScore: integer('home_team_score').default(0),
		awayTeamScore: integer('away_team_score').default(0),

		// for new records, nullable for old data
		scheduledAt: integer('scheduled_at', { mode: 'timestamp_ms' }),
		completedAt: integer('completed_at', { mode: 'timestamp_ms' }),

		status: text({ enum: ['upcoming', 'completed', 'cancelled'] }).default('upcoming'),
	},
	(table) => [
		index('game_seasonId_idx').on(table.seasonId),
		index('game_homeTeamId_idx').on(table.homeTeamId),
		index('game_awayTeamId_idx').on(table.awayTeamId),
	]
);

export const player = sqliteTable(
	'player',
	{
		...baseFields,
		name: text('name').notNull(),
		jerseyNumber: integer('jersey_number'),
		teamId: text('team_id')
			.notNull()
			.references(() => team.id, { onDelete: 'cascade' }),

		// connects a 'player' to a real user account, nullable since a player
		// can be made without it being connected to a real user yet.
		userId: text('user_id').references(() => user.id, { onDelete: 'set null' }),
	},
	(table) => [
		index('player_teamId_idx').on(table.teamId),
		index('player_userId_idx').on(table.userId),
	]
);

export const playerFollower = sqliteTable(
	'player_follower',
	{
		...baseFields,
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		playerId: text('player_id')
			.notNull()
			.references(() => player.id, { onDelete: 'cascade' }),
		relationship: text({
			enum: ['parent', 'guardian', 'relative', 'fan', 'scout', 'other'],
		}).default('fan'),
	},
	(table) => [
		index('playerFollower_userId_idx').on(table.userId),
		index('playerFollower_playerId_idx').on(table.playerId),
	]
);

export const playerGameStat = sqliteTable(
	'player_game_stat',
	{
		...baseFields,
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
	},
	(table) => [
		index('playerGameStat_playerId_idx').on(table.playerId),
		index('playerGameStat_gameId_idx').on(table.gameId),
	]
);

export * from './auth-schema.ts';
