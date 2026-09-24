export type DivisionPlace =
	| 'division_winner'
	| 'second'
	| 'third'
	| 'fourth'
	| 'semis_lost'
	| 'semifinals'
	| 'first_round';

export type PlacementGame = {
	gameType: string;
	homeTeamId: string;
	awayTeamId: string;
	homeScore: number;
	awayScore: number;
	completedAt: number;
};

export function divisionPlaceLabel(place: DivisionPlace): string {
	switch (place) {
		case 'division_winner':
			return 'Division winner';
		case 'second':
			return '2nd';
		case 'third':
			return '3rd';
		case 'fourth':
			return '4th';
		case 'semis_lost':
			return 'Semis lost or (3rd)';
		case 'semifinals':
			return 'Playoffs semifinals';
		case 'first_round':
			return 'Playoffs first round';
	}
}

function played(games: PlacementGame[], teamId: string, gameType: string) {
	return games.some(
		(game) =>
			game.gameType === gameType &&
			(game.homeTeamId === teamId || game.awayTeamId === teamId)
	);
}

function latestForTeam(games: PlacementGame[], teamId: string, gameType: string) {
	return games
		.filter(
			(game) =>
				game.gameType === gameType &&
				(game.homeTeamId === teamId || game.awayTeamId === teamId)
		)
		.sort((a, b) => b.completedAt - a.completedAt)[0];
}

function winnerAndLoser(game: PlacementGame) {
	if (game.homeScore === game.awayScore) return null;
	if (game.homeScore > game.awayScore) {
		return { winnerId: game.homeTeamId, loserId: game.awayTeamId };
	}
	return { winnerId: game.awayTeamId, loserId: game.homeTeamId };
}

/** Place in the division from completed postseason games. Regular-season teams have none. */
export function divisionPlaceForTeam(teamId: string, games: PlacementGame[]): DivisionPlace | null {
	const finals = latestForTeam(games, teamId, 'finals');
	if (finals) {
		const result = winnerAndLoser(finals);
		if (result?.winnerId === teamId) return 'division_winner';
		if (result?.loserId === teamId) return 'second';
		return null;
	}

	const third = latestForTeam(games, teamId, 'third_place');
	if (third) {
		const result = winnerAndLoser(third);
		if (result?.winnerId === teamId) return 'third';
		if (result?.loserId === teamId) return 'fourth';
		return null;
	}

	const semis = latestForTeam(games, teamId, 'semifinal');
	if (semis) {
		const result = winnerAndLoser(semis);
		if (result?.loserId === teamId) return 'semis_lost';
		return 'semifinals';
	}
	if (played(games, teamId, 'playoff')) return 'first_round';
	return null;
}
