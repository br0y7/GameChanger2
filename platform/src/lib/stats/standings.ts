import { isRegularSeasonGameType } from '$lib/schemas/game';
import { dedupeMatchups, type MatchupIdentity } from '$lib/stats/matchup';

export type StandingGame = MatchupIdentity & {
	homeTeamScore: number;
	awayTeamScore: number;
};

export type TeamStanding = {
	teamId: string;
	wins: number;
	losses: number;
	ties: number;
	pointsFor: number;
	pointsAgainst: number;
	rank: number;
};

/** Regular-season games inside the division. A playoff listing on the same day does not remove these. */
export function regularSeasonGames<T extends MatchupIdentity>(
	games: T[],
	teamIds: ReadonlySet<string>
): T[] {
	return dedupeMatchups(
		games.filter(
			(game) =>
				teamIds.has(game.homeTeamId) &&
				teamIds.has(game.awayTeamId) &&
				isRegularSeasonGameType(game.gameType)
		)
	);
}

function winPercentage(row: { wins: number; losses: number }) {
	const decided = row.wins + row.losses;
	return decided === 0 ? 0 : row.wins / decided;
}

function headToHeadWinner(games: StandingGame[], teamA: string, teamB: string) {
	let aWins = 0;
	let bWins = 0;
	for (const game of games) {
		const sides = [game.homeTeamId, game.awayTeamId];
		if (!sides.includes(teamA) || !sides.includes(teamB)) continue;
		if (game.homeTeamScore === game.awayTeamScore) continue;
		const winner = game.homeTeamScore > game.awayTeamScore ? game.homeTeamId : game.awayTeamId;
		if (winner === teamA) aWins += 1;
		else bWins += 1;
	}
	if (aWins === bWins) return null;
	return aWins > bWins ? teamA : teamB;
}

/**
 * Rank before playoffs.
 * Better winning percentage is always a better rank. A 5–3 team cannot share a rank with a 1–7 team.
 * Two teams with the same record use head-to-head, then point differential, then points scored.
 */
export function regularSeasonStandings(teamIds: string[], games: StandingGame[]): TeamStanding[] {
	const ids = new Set(teamIds);
	const regular = regularSeasonGames(games, ids);

	const rows: TeamStanding[] = teamIds.map((teamId) => {
		let wins = 0;
		let losses = 0;
		let ties = 0;
		let pointsFor = 0;
		let pointsAgainst = 0;

		for (const game of regular) {
			if (game.homeTeamId !== teamId && game.awayTeamId !== teamId) continue;
			const isHome = game.homeTeamId === teamId;
			const teamScore = isHome ? game.homeTeamScore : game.awayTeamScore;
			const oppScore = isHome ? game.awayTeamScore : game.homeTeamScore;
			pointsFor += teamScore;
			pointsAgainst += oppScore;
			if (teamScore === oppScore) {
				ties += 1;
				continue;
			}
			if (teamScore > oppScore) wins += 1;
			else losses += 1;
		}

		return { teamId, wins, losses, ties, pointsFor, pointsAgainst, rank: 0 };
	});

	const byRecord = new Map<string, TeamStanding[]>();
	for (const row of rows) {
		const key = `${row.wins}-${row.losses}`;
		const group = byRecord.get(key) ?? [];
		group.push(row);
		byRecord.set(key, group);
	}

	const compare = (a: TeamStanding, b: TeamStanding) => {
		const pct = winPercentage(b) - winPercentage(a);
		if (pct !== 0) return pct;
		if (a.wins !== b.wins) return b.wins - a.wins;
		const group = byRecord.get(`${a.wins}-${a.losses}`) ?? [];
		if (group.length === 2) {
			const winner = headToHeadWinner(regular, a.teamId, b.teamId);
			if (winner === a.teamId) return -1;
			if (winner === b.teamId) return 1;
		}
		const diff = b.pointsFor - b.pointsAgainst - (a.pointsFor - a.pointsAgainst);
		if (diff !== 0) return diff;
		if (a.pointsFor !== b.pointsFor) return b.pointsFor - a.pointsFor;
		return a.teamId.localeCompare(b.teamId);
	};

	const samePlace = (a: TeamStanding, b: TeamStanding) => {
		if (a.wins !== b.wins || a.losses !== b.losses) return false;
		if (a.pointsFor - a.pointsAgainst !== b.pointsFor - b.pointsAgainst) return false;
		if (a.pointsFor !== b.pointsFor) return false;
		const group = byRecord.get(`${a.wins}-${a.losses}`) ?? [];
		if (group.length === 2 && headToHeadWinner(regular, a.teamId, b.teamId)) return false;
		return true;
	};

	rows.sort(compare);
	rows.forEach((row, index) => {
		const previous = index > 0 ? rows[index - 1] : null;
		row.rank = previous && samePlace(previous, row) ? previous.rank : index + 1;
	});
	return rows;
}
