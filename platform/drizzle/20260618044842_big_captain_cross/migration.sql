ALTER TABLE `season` RENAME COLUMN `league_id` TO `organization_id`;--> statement-breakpoint
DROP INDEX IF EXISTS `season_leagueId_idx`;--> statement-breakpoint
CREATE INDEX `season_organizationId_idx` ON `season` (`organization_id`);