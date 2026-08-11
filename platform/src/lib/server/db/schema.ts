import {
	text,
	index,
	timestamp,
	pgEnum,
	real,
	integer,
	uuid,
	snakeCase,
	unique,
	varchar,
} from 'drizzle-orm/pg-core';
import { organization, user } from './auth-schema.ts';
import { baseFields, creationFields, nameSlugFields } from './base-schema.ts';
import { ONBOARDING_DEFAULT_STEP } from '$lib/onboarding/steps';
import { divisionTypes } from '$lib/schemas/division';
import { seasonStatuses } from '$lib/schemas/season';

export const seasonStatusEnum = pgEnum('season_status', seasonStatuses);

export const SEASON_UNIQUE_SLUG_PER_ORG_CONSTRAINT = 'season_slug_org_uq';

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
		unique(SEASON_UNIQUE_SLUG_PER_ORG_CONSTRAINT).on(table.organizationId, table.slug),
	]
);

export type Season = typeof season.$inferSelect;

export const divisionTypeEnum = pgEnum('division_type', divisionTypes);

export const DIVISION_UNIQUE_SLUG_PER_SEASON_CONSTRAINT = 'division_slug_season_uq';

export const division = snakeCase.table(
	'division',
	{
		...baseFields,
		...nameSlugFields,
		type: divisionTypeEnum().notNull().default('community'),
		seasonId: uuid()
			.notNull()
			.references(() => season.id, { onDelete: 'cascade' }),
	},
	(table) => [
		index('division_seasonId_idx').on(table.seasonId),
		unique(DIVISION_UNIQUE_SLUG_PER_SEASON_CONSTRAINT).on(table.seasonId, table.slug),
	]
);

export type Division = typeof division.$inferSelect;

export const TEAM_UNIQUE_SLUG_PER_DIVISION_CONSTRAINT = 'team_slug_division_uq';

export const team = snakeCase.table(
	'team',
	{
		...baseFields,
		...nameSlugFields,
		divisionId: uuid()
			.notNull()
			.references(() => division.id, { onDelete: 'cascade' }),
	},
	(table) => [
		index('team_divisionId_idx').on(table.divisionId),
		unique(TEAM_UNIQUE_SLUG_PER_DIVISION_CONSTRAINT).on(table.divisionId, table.slug),
	]
);

export type Team = typeof team.$inferSelect;

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
			.references(() => season.id, { onDelete: 'cascade' }),
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

		status: gameStatusEnum().notNull().default('upcoming'),
	},
	(table) => [
		index('game_seasonId_idx').on(table.seasonId),
		index('game_homeTeamId_idx').on(table.homeTeamId),
		index('game_awayTeamId_idx').on(table.awayTeamId),
	]
);

export type Game = typeof game.$inferSelect;

export const PLAYER_UNIQUE_JERSEY_PER_TEAM_CONSTRAINT = 'player_jerseyNumber_team_uq';

export const player = snakeCase.table(
	'player',
	{
		...baseFields,
		name: text().notNull(),
		jerseyNumber: varchar({ length: 2 }).notNull(), // supports "00", "01"
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

export type Player = typeof player.$inferSelect;

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
		relationship: relationshipEnum().notNull().default('fan'),
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
			.references(() => player.id, { onDelete: 'cascade' }),
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

export type RawPlayerGameStats = typeof playerGameStat.$inferSelect;

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
