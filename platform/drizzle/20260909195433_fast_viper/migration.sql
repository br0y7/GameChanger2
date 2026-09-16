CREATE TYPE "game_type" AS ENUM('regular', 'playoff');--> statement-breakpoint
ALTER TABLE "game" ADD COLUMN "game_type" "game_type" DEFAULT 'regular'::"game_type" NOT NULL;