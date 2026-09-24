import {
	text,
	index,
	timestamp,
	pgEnum,
	real,
	integer,
	boolean,
	uuid,
	snakeCase,
	unique,
	varchar,
	jsonb,
} from 'drizzle-orm/pg-core';
import type { RatingBreakdown, RatingScaleDistribution } from '$lib/stats/game-rating';
import { invitation, organization, user } from './auth-schema.ts';
import { baseFields, creationFields, nameSlugFields } from './base-schema.ts';
import { ONBOARDING_DEFAULT_STEP } from '$lib/onboarding/steps';
import { divisionTypes } from '$lib/schemas/division';
import { seasonStatuses } from '$lib/schemas/season';
import { gameTypes } from '$lib/schemas/game';
import { coachAssignmentRoles, coachStatuses } from '$lib/schemas/coach';
import { gameStatsStatuses } from '$lib/schemas/game-stats';

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

export const coachAssignmentRoleEnum = pgEnum('coach_assignment_role', coachAssignmentRoles);
export const coachStatusEnum = pgEnum('coach_status', coachStatuses);

export const coach = snakeCase.table(
	'coach',
	{
		...baseFields,
		name: text().notNull(),
		// nullable until the invite is accepted
		userId: uuid().references(() => user.id, { onDelete: 'set null' }),
		teamId: uuid()
			.notNull()
			.references(() => team.id, { onDelete: 'cascade' }),
		assignmentRole: coachAssignmentRoleEnum().notNull().default('head_coach'),
		status: coachStatusEnum().notNull().default('active'),
		email: text(),
		invitedAt: timestamp(),
		acceptedAt: timestamp(),
		expiresAt: timestamp(),
		inviteToken: uuid(),
		invitationId: uuid().references(() => invitation.id, { onDelete: 'set null' }),
	},
	(table) => [
		index('coach_userId_idx').on(table.userId),
		index('coach_teamId_idx').on(table.teamId),
		index('coach_email_idx').on(table.email),
		index('coach_inviteToken_idx').on(table.inviteToken),
	]
);

export type Coach = typeof coach.$inferSelect;

export const gameStatusEnum = pgEnum('game_status', ['upcoming', 'completed', 'cancelled']);
export const gameTypeEnum = pgEnum('game_type', gameTypes);
export const gameStatsStatusEnum = pgEnum('game_stats_status', gameStatsStatuses);

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
		gameType: gameTypeEnum().notNull().default('regular'),
		/** False when the sheet only recorded Win/Lose/Default Lose (no box-score stats). */
		statsAvailable: boolean().notNull().default(true),
		/** True when the sheet recorded points only, with no shot or rebound columns. */
		pointsOnly: boolean().notNull().default(false),
		statsStatus: gameStatsStatusEnum().notNull().default('none'),
		statsSubmittedAt: timestamp(),
		statsSubmittedByUserId: uuid().references(() => user.id, { onDelete: 'set null' }),
		statsPublishedAt: timestamp(),
	},
	(table) => [
		index('game_seasonId_idx').on(table.seasonId),
		index('game_homeTeamId_idx').on(table.homeTeamId),
		index('game_awayTeamId_idx').on(table.awayTeamId),
		index('game_statsStatus_idx').on(table.statsStatus),
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

export const PLAYER_COACH_NOTE_PLAYER_UQ = 'player_coach_note_player_id_uq';

/** Private note for one player's family. Not included on public or coach roster queries. */
export const playerCoachNote = snakeCase.table(
	'player_coach_note',
	{
		...baseFields,
		playerId: uuid()
			.notNull()
			.references(() => player.id, { onDelete: 'cascade' }),
		body: text().notNull(),
	},
	(table) => [
		unique(PLAYER_COACH_NOTE_PLAYER_UQ).on(table.playerId),
		index('playerCoachNote_playerId_idx').on(table.playerId),
	]
);

export type PlayerCoachNote = typeof playerCoachNote.$inferSelect;

export const relationshipEnum = pgEnum('follower_relationship', [
	'fan',
	'parent',
	'relative',
	'guardian',
	'scout',
	'other',
]);

export const familyAccessStatusEnum = pgEnum('family_access_status', [
	'invited',
	'active',
	'expired',
	'removed',
]);

export const playerFollower = snakeCase.table(
	'player_follower',
	{
		...creationFields,
		// nullable until invite is accepted
		userId: uuid().references(() => user.id, { onDelete: 'cascade' }),
		playerId: uuid()
			.notNull()
			.references(() => player.id, { onDelete: 'cascade' }),
		relationship: relationshipEnum().notNull().default('parent'),
		status: familyAccessStatusEnum().notNull().default('active'),
		email: text(),
		invitedAt: timestamp(),
		acceptedAt: timestamp(),
		expiresAt: timestamp(),
		inviteToken: uuid(),
	},
	(table) => [
		index('playerFollower_userId_idx').on(table.userId),
		index('playerFollower_playerId_idx').on(table.playerId),
		index('playerFollower_email_idx').on(table.email),
		index('playerFollower_inviteToken_idx').on(table.inviteToken),
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
		/** Set when the sheet recorded points without a shot breakdown. Other columns stay 0. */
		recordedPts: integer(),

		// GC-v1 game rating. Null until a scale exists or the line is empty.
		gameRating: real(),
		ratingVersion: text(),
		impactScore: real(),
		ratingPercentile: real(),
		contextBonus: real(),
		ratingScaleScope: text({ enum: ['division', 'league'] }),
		ratingBreakdown: jsonb().$type<RatingBreakdown>(),
	},
	(table) => [
		index('playerGameStat_playerId_idx').on(table.playerId),
		index('playerGameStat_gameId_idx').on(table.gameId),
		index('playerGameStat_gameRating_idx').on(table.gameRating),
	]
);

export type RawPlayerGameStats = typeof playerGameStat.$inferSelect;

/** Frozen percentile reference for a rating version. Empty division slug is the league-wide fallback. */
export const gameRatingScale = snakeCase.table(
	'game_rating_scale',
	{
		...baseFields,
		version: text().notNull(),
		organizationId: uuid()
			.notNull()
			.references(() => organization.id, { onDelete: 'cascade' }),
		divisionSlug: text().notNull().default(''),
		scope: text({ enum: ['division', 'league'] }).notNull(),
		sampleSize: integer().notNull(),
		distribution: jsonb().$type<RatingScaleDistribution>().notNull(),
	},
	(table) => [
		unique('game_rating_scale_org_version_slug_uq').on(
			table.organizationId,
			table.version,
			table.divisionSlug
		),
		index('gameRatingScale_organizationId_idx').on(table.organizationId),
	]
);

export type GameRatingScale = typeof gameRatingScale.$inferSelect;

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

/** Per-league public discovery / stats visibility (Admin settings). */
export const leagueVisibility = snakeCase.table(
	'league_visibility',
	{
		organizationId: uuid()
			.primaryKey()
			.references(() => organization.id, { onDelete: 'cascade' }),
		updatedAt: timestamp('updated_at')
			.$onUpdateFn(() => new Date())
			.notNull()
			.defaultNow(),
		/** Appear in public Leagues / Stats discovery. */
		isListed: boolean().notNull().default(true),
		publishStandings: boolean().notNull().default(true),
		publishGameScores: boolean().notNull().default(true),
		publishTeamStats: boolean().notNull().default(true),
		publishPlayerStats: boolean().notNull().default(true),
		showPlayerFullNames: boolean().notNull().default(true),
		showPlayerPhotos: boolean().notNull().default(false),
		showBirthdate: boolean().notNull().default(false),
		/** Always private for GC 1.5 — kept for future; default OFF. */
		publishDevelopmentReports: boolean().notNull().default(false),
	},
	(table) => [index('league_visibility_listed_idx').on(table.isListed)]
);

export type LeagueVisibility = typeof leagueVisibility.$inferSelect;

export * from './auth-schema.ts';
