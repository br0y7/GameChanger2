CREATE TABLE "player_coach_note" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"player_id" uuid NOT NULL CONSTRAINT "player_coach_note_player_id_uq" UNIQUE,
	"body" text NOT NULL
);
--> statement-breakpoint
CREATE INDEX "playerCoachNote_playerId_idx" ON "player_coach_note" ("player_id");--> statement-breakpoint
ALTER TABLE "player_coach_note" ADD CONSTRAINT "player_coach_note_player_id_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "player"("id") ON DELETE CASCADE;