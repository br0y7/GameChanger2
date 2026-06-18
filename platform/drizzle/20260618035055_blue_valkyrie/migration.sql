CREATE TABLE `coach` (
	`id` text PRIMARY KEY,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`name` text NOT NULL,
	`user_id` text,
	`team_id` text NOT NULL,
	CONSTRAINT `fk_coach_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE SET NULL,
	CONSTRAINT `fk_coach_team_id_team_id_fk` FOREIGN KEY (`team_id`) REFERENCES `team`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `player_follower` (
	`id` text PRIMARY KEY,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`user_id` text NOT NULL,
	`player_id` text NOT NULL,
	`relationship` text DEFAULT 'fan',
	CONSTRAINT `fk_player_follower_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_player_follower_player_id_player_id_fk` FOREIGN KEY (`player_id`) REFERENCES `player`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
ALTER TABLE `game` ADD `venue` text;--> statement-breakpoint
ALTER TABLE `game` ADD `home_team_score` integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE `game` ADD `away_team_score` integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE `game` ADD `scheduled_at` integer;--> statement-breakpoint
ALTER TABLE `game` ADD `completed_at` integer;--> statement-breakpoint
ALTER TABLE `game` ADD `status` text DEFAULT 'upcoming';--> statement-breakpoint
ALTER TABLE `team` ADD `slug` text NOT NULL;--> statement-breakpoint
ALTER TABLE `team` ADD `season_id` text NOT NULL REFERENCES season(id) ON DELETE CASCADE;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_team` (
	`id` text PRIMARY KEY,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL UNIQUE,
	`season_id` text NOT NULL,
	CONSTRAINT `fk_team_season_id_season_id_fk` FOREIGN KEY (`season_id`) REFERENCES `season`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
INSERT INTO `__new_team`(`id`, `name`, `created_at`, `updated_at`) SELECT `id`, `name`, `created_at`, `updated_at` FROM `team`;--> statement-breakpoint
DROP TABLE `team`;--> statement-breakpoint
ALTER TABLE `__new_team` RENAME TO `team`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_game` (
	`id` text PRIMARY KEY,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`season_id` text NOT NULL,
	`home_team_id` text NOT NULL,
	`away_team_id` text NOT NULL,
	`name` text NOT NULL,
	`venue` text,
	`home_team_score` integer DEFAULT 0,
	`away_team_score` integer DEFAULT 0,
	`scheduled_at` integer,
	`completed_at` integer,
	`status` text DEFAULT 'upcoming',
	CONSTRAINT `fk_game_season_id_organization_id_fk` FOREIGN KEY (`season_id`) REFERENCES `organization`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_game_home_team_id_team_id_fk` FOREIGN KEY (`home_team_id`) REFERENCES `team`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_game_away_team_id_team_id_fk` FOREIGN KEY (`away_team_id`) REFERENCES `team`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
INSERT INTO `__new_game`(`id`, `created_at`, `updated_at`, `season_id`, `home_team_id`, `away_team_id`, `name`) SELECT `id`, `created_at`, `updated_at`, `season_id`, `home_team_id`, `away_team_id`, `name` FROM `game`;--> statement-breakpoint
DROP TABLE `game`;--> statement-breakpoint
ALTER TABLE `__new_game` RENAME TO `game`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_player` (
	`id` text PRIMARY KEY,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`name` text NOT NULL,
	`jersey_number` integer,
	`team_id` text NOT NULL,
	`user_id` text,
	CONSTRAINT `fk_player_team_id_team_id_fk` FOREIGN KEY (`team_id`) REFERENCES `team`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_player_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE SET NULL
);
--> statement-breakpoint
INSERT INTO `__new_player`(`id`, `created_at`, `updated_at`, `name`, `jersey_number`, `team_id`, `user_id`) SELECT `id`, `created_at`, `updated_at`, `name`, `jersey_number`, `team_id`, `user_id` FROM `player`;--> statement-breakpoint
DROP TABLE `player`;--> statement-breakpoint
ALTER TABLE `__new_player` RENAME TO `player`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
DROP INDEX IF EXISTS `team_organizationId_idx`;--> statement-breakpoint
DROP INDEX IF EXISTS `teamMember_teamId_idx`;--> statement-breakpoint
DROP INDEX IF EXISTS `teamMember_userId_idx`;--> statement-breakpoint
CREATE INDEX `team_seasonId_idx` ON `team` (`season_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `team_slug_uidx` ON `team` (`season_id`,`slug`);--> statement-breakpoint
CREATE INDEX `game_seasonId_idx` ON `game` (`season_id`);--> statement-breakpoint
CREATE INDEX `game_homeTeamId_idx` ON `game` (`home_team_id`);--> statement-breakpoint
CREATE INDEX `game_awayTeamId_idx` ON `game` (`away_team_id`);--> statement-breakpoint
CREATE INDEX `player_teamId_idx` ON `player` (`team_id`);--> statement-breakpoint
CREATE INDEX `player_userId_idx` ON `player` (`user_id`);--> statement-breakpoint
CREATE INDEX `coach_userId_idx` ON `coach` (`user_id`);--> statement-breakpoint
CREATE INDEX `coach_teamId_idx` ON `coach` (`team_id`);--> statement-breakpoint
CREATE INDEX `playerFollower_userId_idx` ON `player_follower` (`user_id`);--> statement-breakpoint
CREATE INDEX `playerFollower_playerId_idx` ON `player_follower` (`player_id`);--> statement-breakpoint
CREATE INDEX `playerGameStat_playerId_idx` ON `player_game_stat` (`player_id`);--> statement-breakpoint
CREATE INDEX `playerGameStat_gameId_idx` ON `player_game_stat` (`game_id`);--> statement-breakpoint
CREATE INDEX `season_leagueId_idx` ON `season` (`league_id`);--> statement-breakpoint
DROP TABLE `team_member`;--> statement-breakpoint
ALTER TABLE `invitation` DROP COLUMN `team_id`;--> statement-breakpoint
ALTER TABLE `session` DROP COLUMN `active_team_id`;