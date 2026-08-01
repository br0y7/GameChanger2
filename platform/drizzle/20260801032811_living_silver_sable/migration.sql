CREATE TYPE "division_type" AS ENUM('competitive', 'community', 'recreational');--> statement-breakpoint
CREATE TYPE "game_status" AS ENUM('upcoming', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "onboarding_role" AS ENUM('organizer', 'coach', 'player', 'player_follower');--> statement-breakpoint
CREATE TYPE "onboarding_status" AS ENUM('not_started', 'in_progress', 'complete');--> statement-breakpoint
CREATE TYPE "follower_relationship" AS ENUM('fan', 'parent', 'relative', 'guardian', 'scout', 'other');--> statement-breakpoint
CREATE TYPE "season_status" AS ENUM('active', 'completed');--> statement-breakpoint
CREATE TABLE "account" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text
);
--> statement-breakpoint
CREATE TABLE "coach" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"name" text NOT NULL,
	"user_id" uuid,
	"team_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "division" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"type" "division_type" DEFAULT 'community'::"division_type" NOT NULL,
	"season_id" uuid NOT NULL,
	CONSTRAINT "division_slug_season_uq" UNIQUE("season_id","slug")
);
--> statement-breakpoint
CREATE TABLE "game" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"season_id" uuid NOT NULL,
	"home_team_id" uuid NOT NULL,
	"away_team_id" uuid NOT NULL,
	"name" text NOT NULL,
	"venue" text,
	"home_team_score" integer DEFAULT 0,
	"away_team_score" integer DEFAULT 0,
	"scheduled_at" timestamp,
	"completed_at" timestamp,
	"status" "game_status" DEFAULT 'upcoming'::"game_status" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invitation" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"organization_id" uuid NOT NULL,
	"email" text NOT NULL,
	"role" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"inviter_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text DEFAULT 'member' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL UNIQUE,
	"logo" text,
	"metadata" text,
	"type" text DEFAULT 'league' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "player" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"name" text NOT NULL,
	"jersey_number" varchar(2),
	"team_id" uuid NOT NULL,
	"user_id" uuid,
	CONSTRAINT "player_jerseyNumber_team_uq" UNIQUE("team_id","jersey_number")
);
--> statement-breakpoint
CREATE TABLE "player_follower" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"user_id" uuid NOT NULL,
	"player_id" uuid NOT NULL,
	"relationship" "follower_relationship" DEFAULT 'fan'::"follower_relationship" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "player_game_stat" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"player_id" uuid NOT NULL,
	"game_id" uuid NOT NULL,
	"min" real DEFAULT 0 NOT NULL,
	"fgm" integer DEFAULT 0 NOT NULL,
	"fga" integer DEFAULT 0 NOT NULL,
	"fg3m" integer DEFAULT 0 NOT NULL,
	"fg3a" integer DEFAULT 0 NOT NULL,
	"ftm" integer DEFAULT 0 NOT NULL,
	"fta" integer DEFAULT 0 NOT NULL,
	"oreb" integer DEFAULT 0 NOT NULL,
	"dreb" integer DEFAULT 0 NOT NULL,
	"ast" integer DEFAULT 0 NOT NULL,
	"tov" integer DEFAULT 0 NOT NULL,
	"stl" integer DEFAULT 0 NOT NULL,
	"blk" integer DEFAULT 0 NOT NULL,
	"pf" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "season" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"organization_id" uuid NOT NULL,
	"status" "season_status" DEFAULT 'active'::"season_status" NOT NULL,
	CONSTRAINT "season_slug_org_uq" UNIQUE("organization_id","slug")
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL UNIQUE,
	"ip_address" text,
	"user_agent" text,
	"user_id" uuid NOT NULL,
	"active_organization_id" text,
	"impersonated_by" text
);
--> statement-breakpoint
CREATE TABLE "team" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"division_id" uuid NOT NULL,
	CONSTRAINT "team_slug_division_uq" UNIQUE("division_id","slug")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL UNIQUE,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"role" text,
	"banned" boolean DEFAULT false,
	"ban_reason" text,
	"ban_expires" timestamp
);
--> statement-breakpoint
CREATE TABLE "user_onboarding" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"role" "onboarding_role",
	"status" "onboarding_status" DEFAULT 'not_started'::"onboarding_status" NOT NULL,
	"current_step" text DEFAULT 'not-started' NOT NULL,
	"user_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" ("user_id");--> statement-breakpoint
CREATE INDEX "coach_userId_idx" ON "coach" ("user_id");--> statement-breakpoint
CREATE INDEX "coach_teamId_idx" ON "coach" ("team_id");--> statement-breakpoint
CREATE INDEX "division_seasonId_idx" ON "division" ("season_id");--> statement-breakpoint
CREATE INDEX "game_seasonId_idx" ON "game" ("season_id");--> statement-breakpoint
CREATE INDEX "game_homeTeamId_idx" ON "game" ("home_team_id");--> statement-breakpoint
CREATE INDEX "game_awayTeamId_idx" ON "game" ("away_team_id");--> statement-breakpoint
CREATE INDEX "invitation_organizationId_idx" ON "invitation" ("organization_id");--> statement-breakpoint
CREATE INDEX "invitation_email_idx" ON "invitation" ("email");--> statement-breakpoint
CREATE INDEX "member_organizationId_idx" ON "member" ("organization_id");--> statement-breakpoint
CREATE INDEX "member_userId_idx" ON "member" ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "organization_slug_uidx" ON "organization" ("slug");--> statement-breakpoint
CREATE INDEX "player_teamId_idx" ON "player" ("team_id");--> statement-breakpoint
CREATE INDEX "player_userId_idx" ON "player" ("user_id");--> statement-breakpoint
CREATE INDEX "playerFollower_userId_idx" ON "player_follower" ("user_id");--> statement-breakpoint
CREATE INDEX "playerFollower_playerId_idx" ON "player_follower" ("player_id");--> statement-breakpoint
CREATE INDEX "playerGameStat_playerId_idx" ON "player_game_stat" ("player_id");--> statement-breakpoint
CREATE INDEX "playerGameStat_gameId_idx" ON "player_game_stat" ("game_id");--> statement-breakpoint
CREATE INDEX "season_organizationId_idx" ON "season" ("organization_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" ("user_id");--> statement-breakpoint
CREATE INDEX "team_divisionId_idx" ON "team" ("division_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" ("identifier");--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "coach" ADD CONSTRAINT "coach_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "coach" ADD CONSTRAINT "coach_team_id_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "team"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "division" ADD CONSTRAINT "division_season_id_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "season"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "game" ADD CONSTRAINT "game_season_id_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "season"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "game" ADD CONSTRAINT "game_home_team_id_team_id_fkey" FOREIGN KEY ("home_team_id") REFERENCES "team"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "game" ADD CONSTRAINT "game_away_team_id_team_id_fkey" FOREIGN KEY ("away_team_id") REFERENCES "team"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_inviter_id_user_id_fkey" FOREIGN KEY ("inviter_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "player" ADD CONSTRAINT "player_team_id_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "team"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "player" ADD CONSTRAINT "player_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "player_follower" ADD CONSTRAINT "player_follower_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "player_follower" ADD CONSTRAINT "player_follower_player_id_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "player"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "player_game_stat" ADD CONSTRAINT "player_game_stat_player_id_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "player"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "player_game_stat" ADD CONSTRAINT "player_game_stat_game_id_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "game"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "season" ADD CONSTRAINT "season_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "team" ADD CONSTRAINT "team_division_id_division_id_fkey" FOREIGN KEY ("division_id") REFERENCES "division"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "user_onboarding" ADD CONSTRAINT "user_onboarding_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;