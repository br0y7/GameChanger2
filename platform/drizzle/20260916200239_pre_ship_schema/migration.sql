CREATE TYPE "family_access_status" AS ENUM('invited', 'active', 'expired', 'removed');--> statement-breakpoint
CREATE TABLE "league_visibility" (
	"organization_id" uuid PRIMARY KEY,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"is_listed" boolean DEFAULT true NOT NULL,
	"publish_standings" boolean DEFAULT true NOT NULL,
	"publish_game_scores" boolean DEFAULT true NOT NULL,
	"publish_team_stats" boolean DEFAULT true NOT NULL,
	"publish_player_stats" boolean DEFAULT true NOT NULL,
	"show_player_full_names" boolean DEFAULT true NOT NULL,
	"show_player_photos" boolean DEFAULT false NOT NULL,
	"show_birthdate" boolean DEFAULT false NOT NULL,
	"publish_development_reports" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE "player_follower" ADD COLUMN "status" "family_access_status" DEFAULT 'active'::"family_access_status" NOT NULL;--> statement-breakpoint
ALTER TABLE "player_follower" ADD COLUMN "email" text;--> statement-breakpoint
ALTER TABLE "player_follower" ADD COLUMN "invited_at" timestamp;--> statement-breakpoint
ALTER TABLE "player_follower" ADD COLUMN "accepted_at" timestamp;--> statement-breakpoint
ALTER TABLE "player_follower" ADD COLUMN "expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "player_follower" ADD COLUMN "invite_token" uuid;--> statement-breakpoint
ALTER TABLE "player_follower" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "player_follower" ALTER COLUMN "relationship" SET DEFAULT 'parent'::"follower_relationship";--> statement-breakpoint
CREATE INDEX "league_visibility_listed_idx" ON "league_visibility" ("is_listed");--> statement-breakpoint
CREATE INDEX "playerFollower_email_idx" ON "player_follower" ("email");--> statement-breakpoint
CREATE INDEX "playerFollower_inviteToken_idx" ON "player_follower" ("invite_token");--> statement-breakpoint
ALTER TABLE "league_visibility" ADD CONSTRAINT "league_visibility_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;