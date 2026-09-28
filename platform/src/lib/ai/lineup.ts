import { averageGameRating } from '$lib/stats/game-rating';
import { averageBy, percentageBy, sumBy, trueShootingPercentage } from '$lib/utils/collection';

/** One player-game reduced to the fields a starting lineup needs. */
export type LineupGame = {
	pointsOnly: boolean;
	pts: number;
	oreb: number;
	dreb: number;
	ast: number;
	stl: number;
	blk: number;
	tov: number;
	pf: number;
	fgm: number;
	fga: number;
	fg3m: number;
	fg3a: number;
	ftm: number;
	fta: number;
	gameRating: number | null;
	playedAt: Date | null;
};

/** Season line used to rank and explain a starting five. Box rates are null when no full box score was recorded. */
export type LineupPlayer = {
	playerId: string;
	name: string;
	jerseyNumber: string;
	gamesPlayed: number;
	points: number;
	rebounds: number;
	assists: number;
	hasBoxScore: boolean;
	offensiveRebounds: number | null;
	defensiveRebounds: number | null;
	steals: number | null;
	blocks: number | null;
	turnovers: number | null;
	fouls: number | null;
	fgPct: number | null;
	fg3Pct: number | null;
	ftPct: number | null;
	trueShootingPct: number | null;
	averageGameRating: number | null;
	recentForm: number | null;
};

export type RankedLineupPlayer = LineupPlayer & {
	starterScore: number;
};

export type RankedLineup = {
	ordered: RankedLineupPlayer[];
	starters: RankedLineupPlayer[];
	sixth: RankedLineupPlayer | null;
	usedGameRating: boolean;
};

function roundTo(value: number, places: number) {
	const factor = 10 ** places;
	return Math.round(value * factor) / factor;
}

function rate(value: number | null) {
	return value ?? 0;
}

/** Counting-stat score, with true shooting as a small adjustment when attempts exist. */
export function starterScore(
	player: Pick<
		LineupPlayer,
		| 'points'
		| 'offensiveRebounds'
		| 'defensiveRebounds'
		| 'assists'
		| 'steals'
		| 'blocks'
		| 'turnovers'
		| 'fouls'
		| 'trueShootingPct'
	>
) {
	let score =
		player.points +
		rate(player.offensiveRebounds) * 1.25 +
		rate(player.defensiveRebounds) * 0.8 +
		rate(player.assists) * 1.35 +
		rate(player.steals) * 2 +
		rate(player.blocks) * 1.75 -
		rate(player.turnovers) * 1.5 -
		rate(player.fouls) * 0.2;

	const ts = player.trueShootingPct;
	if (ts != null) {
		if (ts >= 0.55) score += 1;
		else if (ts >= 0.5) score += 0.5;
		else if (ts < 0.4) score -= 0.5;
	}

	return score;
}

function compareLineup(a: RankedLineupPlayer, b: RankedLineupPlayer, usedGameRating: boolean) {
	if (usedGameRating) {
		const aRated = a.averageGameRating != null;
		const bRated = b.averageGameRating != null;
		if (aRated && bRated) {
			if (a.averageGameRating !== b.averageGameRating) {
				return b.averageGameRating! - a.averageGameRating!;
			}
			const form = rate(b.recentForm) - rate(a.recentForm);
			if (form !== 0) return form;
		} else if (aRated !== bRated) {
			return aRated ? -1 : 1;
		} else if (a.starterScore !== b.starterScore) {
			return b.starterScore - a.starterScore;
		}
	} else if (a.starterScore !== b.starterScore) {
		return b.starterScore - a.starterScore;
	}

	if (a.points !== b.points) return b.points - a.points;
	return a.name.localeCompare(b.name);
}

export function rankLineup(players: LineupPlayer[]): RankedLineup {
	const usedGameRating = players.some((player) => player.averageGameRating != null);
	const ordered = players
		.map((player) => ({ ...player, starterScore: starterScore(player) }))
		.sort((a, b) => compareLineup(a, b, usedGameRating));

	return {
		ordered,
		starters: ordered.slice(0, 5),
		sixth: ordered[5] ?? null,
		usedGameRating,
	};
}

export function lineupPlayerFromGames(
	identity: { playerId: string; name: string; jerseyNumber: string },
	games: LineupGame[]
): LineupPlayer | null {
	if (!games.length) return null;

	const box = games.filter((game) => !game.pointsOnly);
	const hasBoxScore = box.length > 0;
	const rated = games
		.filter((game) => game.gameRating != null)
		.sort((a, b) => (b.playedAt?.getTime() ?? 0) - (a.playedAt?.getTime() ?? 0));
	const ratings = rated.flatMap((game) => (game.gameRating == null ? [] : [game.gameRating]));
	const averageRating = averageGameRating(ratings);
	const recentRatings = ratings.slice(0, 3);
	const recentAverage = averageBy(recentRatings, (rating) => rating);
	const recentForm =
		averageRating == null || recentAverage == null
			? null
			: roundTo(recentAverage - averageRating, 1);

	const fga = sumBy(box, (game) => game.fga);
	const fg3a = sumBy(box, (game) => game.fg3a);
	const fta = sumBy(box, (game) => game.fta);
	const shotOpportunities = fga + 0.44 * fta;

	return {
		playerId: identity.playerId,
		name: identity.name,
		jerseyNumber: identity.jerseyNumber,
		gamesPlayed: games.length,
		points: averageBy(games, (game) => game.pts) ?? 0,
		rebounds: hasBoxScore ? (averageBy(box, (game) => game.oreb + game.dreb) ?? 0) : 0,
		assists: hasBoxScore ? (averageBy(box, (game) => game.ast) ?? 0) : 0,
		hasBoxScore,
		offensiveRebounds: hasBoxScore ? (averageBy(box, (game) => game.oreb) ?? 0) : null,
		defensiveRebounds: hasBoxScore ? (averageBy(box, (game) => game.dreb) ?? 0) : null,
		steals: hasBoxScore ? (averageBy(box, (game) => game.stl) ?? 0) : null,
		blocks: hasBoxScore ? (averageBy(box, (game) => game.blk) ?? 0) : null,
		turnovers: hasBoxScore ? (averageBy(box, (game) => game.tov) ?? 0) : null,
		fouls: hasBoxScore ? (averageBy(box, (game) => game.pf) ?? 0) : null,
		fgPct:
			fga > 0
				? percentageBy(
						box,
						(game) => game.fgm,
						(game) => game.fga
					)
				: null,
		fg3Pct:
			fg3a > 0
				? percentageBy(
						box,
						(game) => game.fg3m,
						(game) => game.fg3a
					)
				: null,
		ftPct:
			fta > 0
				? percentageBy(
						box,
						(game) => game.ftm,
						(game) => game.fta
					)
				: null,
		trueShootingPct:
			shotOpportunities > 0
				? trueShootingPercentage(
						sumBy(box, (game) => game.pts),
						fga,
						fta
					)
				: null,
		averageGameRating: averageRating,
		recentForm,
	};
}

function jersey(player: { jerseyNumber: string }) {
	return `#${player.jerseyNumber}`;
}

function joinJerseys(players: { jerseyNumber: string }[]) {
	const labels = players.map(jersey);
	if (labels.length <= 1) return labels[0] ?? '';
	if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
	return `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`;
}

function signed(value: number) {
	const text = value.toFixed(1);
	return value > 0 ? `+${text}` : text;
}

function pct(value: number) {
	return `${(value * 100).toFixed(1)}%`;
}

function statLine(player: RankedLineupPlayer) {
	const parts = [`${player.points.toFixed(1)} PPG`];
	if (player.hasBoxScore) {
		parts.push(
			`${rate(player.offensiveRebounds).toFixed(1)} ORPG`,
			`${rate(player.defensiveRebounds).toFixed(1)} DRPG`,
			`${player.rebounds.toFixed(1)} RPG`,
			`${player.assists.toFixed(1)} APG`,
			`${rate(player.steals).toFixed(1)} SPG`,
			`${rate(player.blocks).toFixed(1)} BPG`,
			`${rate(player.turnovers).toFixed(1)} TO`,
			`${rate(player.fouls).toFixed(1)} PF`
		);
	}
	if (player.fgPct != null) parts.push(`FG ${pct(player.fgPct)}`);
	if (player.fg3Pct != null) parts.push(`3P ${pct(player.fg3Pct)}`);
	if (player.ftPct != null) parts.push(`FT ${pct(player.ftPct)}`);
	if (player.trueShootingPct != null) parts.push(`TS ${pct(player.trueShootingPct)}`);
	if (player.averageGameRating != null) {
		parts.push(`Avg Game Rating ${player.averageGameRating.toFixed(1)}`);
	}
	if (player.recentForm != null) parts.push(`recent form ${signed(player.recentForm)}`);
	parts.push(`${player.gamesPlayed} GP`);
	return `- ${jersey(player)} ${player.name}: ${parts.join(', ')}`;
}

function leaderPhrase(
	players: LineupPlayer[],
	label: string,
	value: (player: LineupPlayer) => number | null,
	suffix: string
) {
	const rows = players.flatMap((player) => {
		const stat = value(player);
		return stat == null ? [] : [{ player, stat }];
	});
	if (!rows.length) return null;
	const best = Math.max(...rows.map((row) => row.stat));
	const leaders = rows.filter((row) => row.stat === best).map((row) => row.player);
	return `- ${label}: ${joinJerseys(leaders)} (${best.toFixed(1)} ${suffix})`;
}

function rankingDetail(player: RankedLineupPlayer, usedGameRating: boolean) {
	const score = `starter score ${player.starterScore.toFixed(1)}`;
	const points = `${player.points.toFixed(1)} PPG`;
	if (player.averageGameRating != null) {
		const form = player.recentForm == null ? '' : `, recent form ${signed(player.recentForm)}`;
		return `- ${jersey(player)} ${player.name}: Average Game Rating ${player.averageGameRating.toFixed(1)}${form}, ${score}, ${points}`;
	}
	const missing = usedGameRating ? 'no Game Rating, ' : '';
	return `- ${jersey(player)} ${player.name}: ${missing}${score}, ${points}`;
}

/** Context block for coaches. The five is already chosen; the model only explains it. */
export function formatLineupContext(teamName: string, players: LineupPlayer[]) {
	const header = `Team: ${teamName}. Lineup questions are about this team. Do not ask the coach to confirm the team or choose a division.`;
	if (!players.length) {
		return `${header}\nNo players with recorded games, so there is no starting five.`;
	}

	const ranked = rankLineup(players);
	const opening = `I'd start ${joinJerseys(ranked.starters)}.`;
	const sixth = ranked.sixth
		? `6th man: ${jersey(ranked.sixth)}.`
		: 'There is no 6th man; fewer than 6 players have recorded games.';
	const sortRule = ranked.usedGameRating
		? 'Sorted by Average Game Rating (highest first). Ties break by recent form, then higher PPG, then name A–Z. Players with no Game Rating are ranked after rated players by starter score, then higher PPG, then name A–Z.'
		: 'Sorted by starter score (highest first). Ties break by higher PPG, then name A–Z. Average Game Rating is not available for this roster.';

	const leaders = [
		leaderPhrase(ranked.ordered, 'Scoring', (player) => player.points, 'PPG'),
		leaderPhrase(
			ranked.ordered,
			'Rebounds',
			(player) => (player.hasBoxScore ? player.rebounds : null),
			'RPG'
		),
		leaderPhrase(
			ranked.ordered,
			'Assists',
			(player) => (player.hasBoxScore ? player.assists : null),
			'APG'
		),
	].filter((line) => line != null);

	return [
		header,
		'',
		'Recommended lineup (already ranked — do not recalculate or invent a different five):',
		opening,
		sixth,
		'',
		'Ranked order for rotations (do not print this list when they only ask who should start):',
		...ranked.ordered.map((player, index) => `${index + 1}. ${jersey(player)} ${player.name}`),
		'',
		'Stats for the explanation. Cite only the numbers that matter. Do not invent a role the stats do not support.',
		'Leaders on this roster (do not name a different leader):',
		...leaders,
		...ranked.ordered.map(statLine),
		'',
		'Ranking detail (reveal only if they ask how you ranked them or to show the calculation):',
		sortRule,
		...ranked.ordered.map((player) => rankingDetail(player, ranked.usedGameRating)),
	].join('\n');
}
