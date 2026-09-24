ALTER TYPE "game_type" ADD VALUE 'third_place';--> statement-breakpoint
ALTER TABLE "game" ADD COLUMN "points_only" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "player_game_stat" ADD COLUMN "recorded_pts" integer;