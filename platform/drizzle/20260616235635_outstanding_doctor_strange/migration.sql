CREATE TABLE `game` (
	`id` text PRIMARY KEY,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`season_id` text NOT NULL,
	`home_team_id` text NOT NULL,
	`away_team_id` text NOT NULL,
	CONSTRAINT `fk_game_season_id_organization_id_fk` FOREIGN KEY (`season_id`) REFERENCES `organization`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_game_home_team_id_team_id_fk` FOREIGN KEY (`home_team_id`) REFERENCES `team`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_game_away_team_id_team_id_fk` FOREIGN KEY (`away_team_id`) REFERENCES `team`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `player` (
	`id` text PRIMARY KEY,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`name` text NOT NULL,
	`jersey_number` integer,
	`team_id` text,
	`user_id` text,
	CONSTRAINT `fk_player_team_id_team_id_fk` FOREIGN KEY (`team_id`) REFERENCES `team`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_player_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE SET NULL
);
--> statement-breakpoint
CREATE TABLE `player_game_stat` (
	`id` text PRIMARY KEY,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`player_id` text,
	`game_id` text,
	`min` real DEFAULT 0 NOT NULL,
	`fgm` integer DEFAULT 0 NOT NULL,
	`fga` integer DEFAULT 0 NOT NULL,
	`fg3m` integer DEFAULT 0 NOT NULL,
	`fg3a` integer DEFAULT 0 NOT NULL,
	`ftm` integer DEFAULT 0 NOT NULL,
	`fta` integer DEFAULT 0 NOT NULL,
	`oreb` integer DEFAULT 0 NOT NULL,
	`dreb` integer DEFAULT 0 NOT NULL,
	`ast` integer DEFAULT 0 NOT NULL,
	`tov` integer DEFAULT 0 NOT NULL,
	`stl` integer DEFAULT 0 NOT NULL,
	`blk` integer DEFAULT 0 NOT NULL,
	`pf` integer DEFAULT 0 NOT NULL,
	CONSTRAINT `fk_player_game_stat_player_id_team_id_fk` FOREIGN KEY (`player_id`) REFERENCES `team`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_player_game_stat_game_id_game_id_fk` FOREIGN KEY (`game_id`) REFERENCES `game`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `season` (
	`id` text PRIMARY KEY,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`name` text NOT NULL,
	`league_id` text NOT NULL,
	`status` text DEFAULT 'active',
	CONSTRAINT `fk_season_league_id_organization_id_fk` FOREIGN KEY (`league_id`) REFERENCES `organization`(`id`) ON DELETE CASCADE
);
