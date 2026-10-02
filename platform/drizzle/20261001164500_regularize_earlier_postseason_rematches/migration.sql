UPDATE "game" AS g
SET "game_type" = 'regular'
WHERE g."game_type" IN ('playoff', 'semifinal', 'finals', 'third_place')
AND EXISTS (
	SELECT 1
	FROM "game" AS later
	WHERE later."id" <> g."id"
	AND later."season_id" = g."season_id"
	AND COALESCE(later."completed_at", later."scheduled_at")
		> COALESCE(g."completed_at", g."scheduled_at")
	AND (
		(later."home_team_id" = g."home_team_id" AND later."away_team_id" = g."away_team_id")
		OR (later."home_team_id" = g."away_team_id" AND later."away_team_id" = g."home_team_id")
	)
);
