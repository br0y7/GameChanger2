UPDATE "game" SET "game_type" = 'semifinal'
WHERE "game_type" = 'regular' AND "name" ~* 'semi';--> statement-breakpoint
UPDATE "game" SET "game_type" = 'third_place'
WHERE "game_type" = 'regular' AND "name" ~* 'third place|3rd place';--> statement-breakpoint
UPDATE "game" SET "game_type" = 'finals'
WHERE "game_type" = 'regular' AND "name" ~* '(final|championship)' AND "name" !~* 'semi';--> statement-breakpoint
UPDATE "game" SET "game_type" = 'playoff'
WHERE "game_type" = 'regular' AND "name" ~* 'playoff';