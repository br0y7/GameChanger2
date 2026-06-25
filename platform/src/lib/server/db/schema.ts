import {
	text,
	index,
	uniqueIndex,
	timestamp,
	pgEnum,
	real,
	integer,
	uuid,
	snakeCase,
	unique,
} from 'drizzle-orm/pg-core';
import { organization, user } from './auth-schema.ts';
import { baseFields, creationFields, nameSlugFields } from './base-schema.ts';
import { ONBOARDING_DEFAULT_STEP } from '$lib/onboarding/steps';

export const seasonStatusEnum = pgEnum('season_status', ['active', 'completed']);

export const season = snakeCase.table(
	'season',
	{
		...baseFields,
		...nameSlugFields,
		organizationId: uuid()
			.notNull()
			.references(() => organization.id, { onDelete: 'cascade' }),
		status: seasonStatusEnum().notNull().default('active'),
	},
	(table) => [
		index('season_organizationId_idx').on(table.organizationId),
		uniqueIndex('season_slug_uidx').on(table.organizationId, table.slug),
	]
);

export type Season = typeof season.$inferSelect;

export const team = snakeCase.table(
	'team',
	{
		...baseFields,
		...nameSlugFields,
		seasonId: uuid()
			.notNull()
			.references(() => season.id, { onDelete: 'cascade' }),
	},
	(table) => [
		index('team_seasonId_idx').on(table.seasonId),
		uniqueIndex('team_slug_uidx').on(table.seasonId, table.slug),
	]
);

export const coach = snakeCase.table(
	'coach',
	{
		...baseFields,
		name: text().notNull(),
		// nullable, organizer creates a record then invites a coach
		userId: uuid().references(() => user.id, { onDelete: 'set null' }),
		teamId: uuid()
			.notNull()
			.references(() => team.id, { onDelete: 'cascade' }),
		// potentially could add 'type/role' if you want to disambiguate head, assistant coach
	},
	(table) => [
		index('coach_userId_idx').on(table.userId),
		index('coach_teamId_idx').on(table.teamId),
	]
);

export const gameStatusEnum = pgEnum('game_status', ['upcoming', 'completed', 'cancelled']);

export const game = snakeCase.table(
	'game',
	{
		...baseFields,
		seasonId: uuid()
			.notNull()
			.references(() => organization.id, { onDelete: 'cascade' }),
		homeTeamId: uuid()
			.notNull()
			.references(() => team.id, { onDelete: 'cascade' }),
		awayTeamId: uuid()
			.notNull()
			.references(() => team.id, { onDelete: 'cascade' }),
		name: text().notNull(),
		venue: text(),

		// filled after completing the game for caching reasons (less db lookup)
		homeTeamScore: integer().default(0),
		awayTeamScore: integer().default(0),

		// for new records, nullable for old data
		scheduledAt: timestamp(),
		completedAt: timestamp(),

		status: gameStatusEnum().default('upcoming'),
	},
	(table) => [
		index('game_seasonId_idx').on(table.seasonId),
		index('game_homeTeamId_idx').on(table.homeTeamId),
		index('game_awayTeamId_idx').on(table.awayTeamId),
	]
);

export const PLAYER_UNIQUE_JERSEY_PER_TEAM_CONSTRAINT = 'player_jerseyNumber_team_uq';

export const player = snakeCase.table(
	'player',
	{
		...baseFields,
		name: text().notNull(),
		jerseyNumber: integer(),
		teamId: uuid()
			.notNull()
			.references(() => team.id, { onDelete: 'cascade' }),

		// connects a 'player' to a real user account, nullable since a player
		// can be made without it being connected to a real user yet.
		userId: uuid().references(() => user.id, { onDelete: 'set null' }),
	},
	(table) => [
		index('player_teamId_idx').on(table.teamId),
		index('player_userId_idx').on(table.userId),
		unique(PLAYER_UNIQUE_JERSEY_PER_TEAM_CONSTRAINT).on(table.teamId, table.jerseyNumber),
	]
);

export const relationshipEnum = pgEnum('follower_relationship', [
	'fan',
	'parent',
	'relative',
	'guardian',
	'scout',
	'other',
]);

export const playerFollower = snakeCase.table(
	'player_follower',
	{
		...creationFields,
		userId: uuid()
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		playerId: uuid()
			.notNull()
			.references(() => player.id, { onDelete: 'cascade' }),
		relationship: relationshipEnum().default('fan'),
	},
	(table) => [
		index('playerFollower_userId_idx').on(table.userId),
		index('playerFollower_playerId_idx').on(table.playerId),
	]
);

export const playerGameStat = snakeCase.table(
	'player_game_stat',
	{
		...baseFields,
		playerId: uuid()
			.notNull()
			.references(() => team.id, { onDelete: 'cascade' }),
		gameId: uuid()
			.notNull()
			.references(() => game.id, { onDelete: 'cascade' }),

		// raw stats per game no % since percentages can be derived from raw stats

		// minutes played
		min: real().default(0.0).notNull(),
		// field goals made & attempt
		fgm: integer().default(0).notNull(),
		fga: integer().default(0).notNull(),
		// three points made & attempt
		fg3m: integer().default(0).notNull(),
		fg3a: integer().default(0).notNull(),
		// free throws made & attempt
		ftm: integer().default(0).notNull(),
		fta: integer().default(0).notNull(),
		// offensive & defensive rebounds
		oreb: integer().default(0).notNull(),
		dreb: integer().default(0).notNull(),
		// assists
		ast: integer().default(0).notNull(),
		// turnovers
		tov: integer().default(0).notNull(),
		// steals
		stl: integer().default(0).notNull(),
		// blocks
		blk: integer().default(0).notNull(),
		// personal fouls
		pf: integer().default(0).notNull(),
	},
	(table) => [
		index('playerGameStat_playerId_idx').on(table.playerId),
		index('playerGameStat_gameId_idx').on(table.gameId),
	]
);

export const onboardingRole = pgEnum('onboarding_role', [
	'organizer',
	'coach',
	'player',
	'player_follower',
]);

export const onboardingStatus = pgEnum('onboarding_status', [
	'not_started',
	'in_progress',
	'complete',
]);

export const userOnboarding = snakeCase.table('user_onboarding', {
	...baseFields,
	role: onboardingRole(),
	status: onboardingStatus().default('not_started').notNull(),
	currentStep: text().default(ONBOARDING_DEFAULT_STEP).notNull(),
	userId: uuid()
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
});

export type Onboarding = typeof userOnboarding.$inferSelect;

export * from './auth-schema.ts';
