export function pointsFromRaw(stat: {
	fgm: number;
	fg3m: number;
	ftm: number;
	recordedPts?: number | null;
}) {
	if (stat.recordedPts != null) return stat.recordedPts;
	return (stat.fgm - stat.fg3m) * 2 + stat.fg3m * 3 + stat.ftm;
}

export type GameScoreLine = {
	homeTeamId: string;
	awayTeamId: string;
	homeTeamScore?: number | null;
	awayTeamScore?: number | null;
	playerStats?: {
		fgm: number;
		fg3m: number;
		ftm: number;
		recordedPts?: number | null;
		player?: { teamId: string } | null;
	}[];
};

/** Stored scores when they exist; otherwise the box-score point totals. */
export function resolveGameScores(game: GameScoreLine) {
	const storedHome = game.homeTeamScore ?? 0;
	const storedAway = game.awayTeamScore ?? 0;
	if (storedHome > 0 || storedAway > 0) {
		return { home: storedHome, away: storedAway };
	}

	let home = 0;
	let away = 0;
	for (const stat of game.playerStats ?? []) {
		const teamId = stat.player?.teamId;
		const pts = pointsFromRaw(stat);
		if (teamId === game.homeTeamId) home += pts;
		else if (teamId === game.awayTeamId) away += pts;
	}
	return { home, away };
}

export function teamResult(teamScore: number, oppScore: number): 'W' | 'L' | 'T' {
	return teamScore > oppScore ? 'W' : teamScore < oppScore ? 'L' : 'T';
}

export function scoresForTeam(game: GameScoreLine, teamId: string) {
	const { home, away } = resolveGameScores(game);
	const isHome = game.homeTeamId === teamId;
	const teamScore = isHome ? home : away;
	const oppScore = isHome ? away : home;
	return { isHome, teamScore, oppScore, result: teamResult(teamScore, oppScore) };
}
