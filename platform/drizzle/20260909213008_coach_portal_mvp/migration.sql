CREATE TYPE "coach_assignment_role" AS ENUM('head_coach', 'assistant_coach', 'stat_keeper');--> statement-breakpoint
CREATE TYPE "coach_status" AS ENUM('invited', 'active', 'expired', 'removed');--> statement-breakpoint
CREATE TYPE "game_stats_status" AS ENUM('none', 'draft', 'submitted', 'published');--> statement-breakpoint
ALTER TABLE "coach" ADD COLUMN "assignment_role" "coach_assignment_role" DEFAULT 'head_coach'::"coach_assignment_role" NOT NULL;--> statement-breakpoint
ALTER TABLE "coach" ADD COLUMN "status" "coach_status" DEFAULT 'active'::"coach_status" NOT NULL;--> statement-breakpoint
ALTER TABLE "coach" ADD COLUMN "email" text;--> statement-breakpoint
ALTER TABLE "coach" ADD COLUMN "invited_at" timestamp;--> statement-breakpoint
ALTER TABLE "coach" ADD COLUMN "accepted_at" timestamp;--> statement-breakpoint
ALTER TABLE "coach" ADD COLUMN "expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "coach" ADD COLUMN "invite_token" uuid;--> statement-breakpoint
ALTER TABLE "coach" ADD COLUMN "invitation_id" uuid;--> statement-breakpoint
ALTER TABLE "game" ADD COLUMN "stats_status" "game_stats_status" DEFAULT 'none'::"game_stats_status" NOT NULL;--> statement-breakpoint
ALTER TABLE "game" ADD COLUMN "stats_submitted_at" timestamp;--> statement-breakpoint
ALTER TABLE "game" ADD COLUMN "stats_submitted_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "game" ADD COLUMN "stats_published_at" timestamp;--> statement-breakpoint
CREATE INDEX "coach_email_idx" ON "coach" ("email");--> statement-breakpoint
CREATE INDEX "coach_inviteToken_idx" ON "coach" ("invite_token");--> statement-breakpoint
CREATE INDEX "game_statsStatus_idx" ON "game" ("stats_status");--> statement-breakpoint
ALTER TABLE "coach" ADD CONSTRAINT "coach_invitation_id_invitation_id_fkey" FOREIGN KEY ("invitation_id") REFERENCES "invitation"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "game" ADD CONSTRAINT "game_stats_submitted_by_user_id_user_id_fkey" FOREIGN KEY ("stats_submitted_by_user_id") REFERENCES "user"("id") ON DELETE SET NULL;