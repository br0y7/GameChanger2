CREATE TYPE "demo_link_kind" AS ENUM('family', 'coach', 'league');--> statement-breakpoint
CREATE TABLE "demo_link" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"token" uuid NOT NULL CONSTRAINT "demo_link_token_uq" UNIQUE,
	"kind" "demo_link_kind" NOT NULL,
	"organization_id" uuid NOT NULL,
	"player_id" uuid,
	"team_id" uuid,
	"created_by_user_id" uuid NOT NULL,
	"expires_at" timestamp NOT NULL,
	"revoked_at" timestamp,
	"label" text
);
--> statement-breakpoint
CREATE INDEX "demoLink_token_idx" ON "demo_link" ("token");--> statement-breakpoint
CREATE INDEX "demoLink_organizationId_idx" ON "demo_link" ("organization_id");--> statement-breakpoint
CREATE INDEX "demoLink_createdByUserId_idx" ON "demo_link" ("created_by_user_id");--> statement-breakpoint
ALTER TABLE "demo_link" ADD CONSTRAINT "demo_link_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "demo_link" ADD CONSTRAINT "demo_link_player_id_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "player"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "demo_link" ADD CONSTRAINT "demo_link_team_id_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "team"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "demo_link" ADD CONSTRAINT "demo_link_created_by_user_id_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "user"("id") ON DELETE CASCADE;