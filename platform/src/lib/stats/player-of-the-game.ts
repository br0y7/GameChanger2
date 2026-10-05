/** Declare a single MVP when the leader is this far ahead. */
export const MVP_CLEAR_LEAD = 0.4;
/** Present both players when the gap is this small. */
export const MVP_CLOSE_MAX_GAP = 0.3;

export type RatedMvpPlayer = {
	playerId: string;
	gameRating: number | null;
};

export type MvpDecision<T extends RatedMvpPlayer> =
	| { kind: 'mvp'; players: [T] }
	| { kind: 'candidates'; players: [T, T] }
	| { kind: 'none'; players: [] };

/** Official MVP from Game Ratings. AI does not pick or override this. */
export function decideMvp<T extends RatedMvpPlayer>(players: T[]): MvpDecision<T> {
	const rated = players
		.filter((player): player is T & { gameRating: number } => player.gameRating != null)
		.sort((a, b) => {
			if (b.gameRating !== a.gameRating) return b.gameRating - a.gameRating;
			return a.playerId.localeCompare(b.playerId);
		});

	if (!rated.length) return { kind: 'none', players: [] };

	const [first, second] = rated;
	if (!second || first.gameRating - second.gameRating >= MVP_CLEAR_LEAD) {
		return { kind: 'mvp', players: [first] };
	}
	if (first.gameRating - second.gameRating <= MVP_CLOSE_MAX_GAP) {
		return { kind: 'candidates', players: [first, second] };
	}
	return { kind: 'mvp', players: [first] };
}
