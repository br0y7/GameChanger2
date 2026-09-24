CREATE TABLE "game_rating_scale" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"version" text NOT NULL,
	"organization_id" uuid NOT NULL,
	"division_slug" text DEFAULT '' NOT NULL,
	"scope" text NOT NULL,
	"sample_size" integer NOT NULL,
	"distribution" jsonb NOT NULL,
	CONSTRAINT "game_rating_scale_org_version_slug_uq" UNIQUE("organization_id","version","division_slug")
);
--> statement-breakpoint
ALTER TABLE "player_game_stat" ADD COLUMN "game_rating" real;--> statement-breakpoint
ALTER TABLE "player_game_stat" ADD COLUMN "rating_version" text;--> statement-breakpoint
ALTER TABLE "player_game_stat" ADD COLUMN "impact_score" real;--> statement-breakpoint
ALTER TABLE "player_game_stat" ADD COLUMN "rating_percentile" real;--> statement-breakpoint
ALTER TABLE "player_game_stat" ADD COLUMN "context_bonus" real;--> statement-breakpoint
ALTER TABLE "player_game_stat" ADD COLUMN "rating_scale_scope" text;--> statement-breakpoint
ALTER TABLE "player_game_stat" ADD COLUMN "rating_breakdown" jsonb;--> statement-breakpoint
CREATE INDEX "gameRatingScale_organizationId_idx" ON "game_rating_scale" ("organization_id");--> statement-breakpoint
CREATE INDEX "playerGameStat_gameRating_idx" ON "player_game_stat" ("game_rating");--> statement-breakpoint
ALTER TABLE "game_rating_scale" ADD CONSTRAINT "game_rating_scale_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;