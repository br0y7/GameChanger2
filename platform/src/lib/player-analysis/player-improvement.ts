import { derivePlayerStats } from '$lib/stats/player-stats';
import { derivePlayerStrengths } from '$lib/player-analysis/player-strengths';
import { derivePlayerWeaknesses } from '$lib/player-analysis/player-weaknesses';
import { dedupeByMatchup } from '$lib/stats/matchup';
import { shootingPercentageBy } from '$lib/utils/collection';
import type { PlayerGameStats, WithGame } from '$lib/schemas/player-game-stat';
import type {
	ImprovementMetric,
	PlayerAnalysis,
	PlayerProgress,
	TrendDirection,
} from '$lib/schemas/player-analysis';

const PREFERRED_RECENT_GAMES = 5;
const MIN_RECENT_GAMES = 3;
const COUNTING_FLAT = 0.05;
const SHOOTING_FLAT = 0.02;

type SeasonGame = WithGame<PlayerGameStats>;

function gameTime(stat: SeasonGame) {
	return (stat.game?.completedAt ?? stat.game?.scheduledAt)?.getTime() ?? 0;
}

/** Same player row can pick up older seasons after imports — only compare this season. */
export function gamesInSeason(gameStats: SeasonGame[], seasonId: string | null | undefined) {
	const unique = dedupeByMatchup(gameStats, (stat) => stat.game);
	if (!seasonId) return unique;
	return unique.filter((stat) => stat.game?.seasonId === seasonId);
}

export function recentWindowSize(seasonGames: number): 3 | 5 | null {
	if (seasonGames >= PREFERRED_RECENT_GAMES) return PREFERRED_RECENT_GAMES;
	if (seasonGames >= MIN_RECENT_GAMES) return MIN_RECENT_GAMES;
	return null;
}

function countingAverage(
	games: SeasonGame[],
	pick: (stat: SeasonGame) => number,
	recorded: (stat: SeasonGame) => boolean
): number | null {
	const usable = games.filter(recorded);
	if (!usable.length) return null;
	return usable.reduce((sum, stat) => sum + pick(stat), 0) / usable.length;
}

function shootingFromTotals(
	games: SeasonGame[],
	makes: (stat: SeasonGame) => number,
	attempts: (stat: SeasonGame) => number
): number | null {
	const box = games.filter((stat) => !stat.pointsOnly);
	return shootingPercentageBy(box, makes, attempts) ?? null;
}

function countingMetric(
	key: ImprovementMetric['key'],
	label: string,
	seasonGames: SeasonGame[],
	recentGames: SeasonGame[],
	pick: (stat: SeasonGame) => number,
	recorded: (stat: SeasonGame) => boolean
): ImprovementMetric {
	const season = countingAverage(seasonGames, pick, recorded);
	const recent = countingAverage(recentGames, pick, recorded);
	return finishMetric(key, label, 'count', season, recent, recentGames.filter(recorded).length);
}

function shootingMetric(
	key: ImprovementMetric['key'],
	label: string,
	seasonGames: SeasonGame[],
	recentGames: SeasonGame[],
	makes: (stat: SeasonGame) => number,
	attempts: (stat: SeasonGame) => number
): ImprovementMetric {
	const season = shootingFromTotals(seasonGames, makes, attempts);
	const recent = shootingFromTotals(recentGames, makes, attempts);
	const recentSample = recentGames.filter(
		(stat) => !stat.pointsOnly && Math.max(attempts(stat), makes(stat)) > 0
	).length;
	return finishMetric(key, label, 'percent', season, recent, recentSample);
}

function finishMetric(
	key: ImprovementMetric['key'],
	label: string,
	format: ImprovementMetric['format'],
	season: number | null,
	recent: number | null,
	recentSampleSize: number
): ImprovementMetric {
	let changePct: number | null = null;
	let trend: TrendDirection | null = null;

	if (season != null && recent != null) {
		if (format === 'percent') {
			const delta = recent - season;
			trend = Math.abs(delta) < SHOOTING_FLAT ? 'flat' : delta > 0 ? 'up' : 'down';
			changePct = Math.round(delta * 100);
		} else if (season <= 0.05) {
			trend = recent > season + 0.15 ? 'up' : recent < season - 0.15 ? 'down' : 'flat';
			changePct = recent > 0.05 && season <= 0.05 ? 100 : 0;
		} else {
			const rel = (recent - season) / season;
			trend = Math.abs(rel) < COUNTING_FLAT ? 'flat' : rel > 0 ? 'up' : 'down';
			changePct = Math.round(rel * 100);
		}
	}

	return { key, label, format, season, recent, recentSampleSize, changePct, trend };
}

export function formatImprovementChange(metric: ImprovementMetric): string | null {
	if (metric.changePct == null || metric.season == null || metric.recent == null) return null;
	if (metric.format === 'percent') {
		const sign = metric.changePct > 0 ? '+' : '';
		return `${sign}${metric.changePct} pp`;
	}
	const sign = metric.changePct > 0 ? '+' : '';
	return `${sign}${metric.changePct}%`;
}

function sentenceFor(metric: ImprovementMetric): string | null {
	if (metric.season == null && metric.recent == null) return null;
	const name = metric.key === 'fgPct' ? 'FG%' : metric.label.toLowerCase();
	if (metric.season == null || metric.recent == null) {
		return `${name} was not recorded in enough games to compare`;
	}

	const change = formatImprovementChange(metric);
	const copula = metric.key === 'assists' ? 'are' : 'is';
	if (metric.trend === 'up') {
		return `${name} ${copula} up${change ? ` (${change})` : ''}`;
	}
	if (metric.trend === 'down') {
		return `${name} ${copula} down${change ? ` (${change})` : ''}`;
	}
	return `${name} ${copula} steady`;
}

function joinSentences(parts: string[]) {
	if (parts.length === 1) return parts[0];
	if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
	return `${parts.slice(0, -1).join(', ')}, and ${parts[parts.length - 1]}`;
}

export function developmentSummary(
	metrics: ImprovementMetric[],
	window: 3 | 5 | null,
	seasonGameCount: number
): string | null {
	if (seasonGameCount <= 0) return null;
	if (!window) {
		return `Based on ${seasonGameCount} game${seasonGameCount === 1 ? '' : 's'} this season. A few more games will show recent trends.`;
	}

	const byKey = new Map(metrics.map((metric) => [metric.key, metric]));
	const parts = [byKey.get('points'), byKey.get('rebounds'), byKey.get('assists'), byKey.get('fgPct')]
		.flatMap((metric) => (metric ? [sentenceFor(metric)] : []))
		.filter((line): line is string => !!line);

	if (!parts.length) {
		return 'This season does not have enough recorded box-score stats yet for a development summary.';
	}
	return `Over the last ${window} games, ${joinSentences(parts)}.`;
}

export function playerProgressFromGames(
	gameStats: SeasonGame[],
	seasonId?: string | null
): PlayerProgress {
	const seasonGames = gamesInSeason(gameStats, seasonId).sort((a, b) => gameTime(a) - gameTime(b));
	const recentWindow = recentWindowSize(seasonGames.length);
	const recentGames = recentWindow ? seasonGames.slice(-recentWindow) : [];

	const boxRecorded = (stat: SeasonGame) => !stat.pointsOnly;
	const metrics: ImprovementMetric[] = [
		countingMetric('points', 'Scoring', seasonGames, recentGames, (stat) => stat.pts, boxRecorded),
		countingMetric(
			'rebounds',
			'Rebounding',
			seasonGames,
			recentGames,
			(stat) => stat.reb,
			boxRecorded
		),
		countingMetric(
			'assists',
			'Assists',
			seasonGames,
			recentGames,
			(stat) => stat.ast,
			boxRecorded
		),
		shootingMetric(
			'fgPct',
			'FG%',
			seasonGames,
			recentGames,
			(stat) => stat.fgm,
			(stat) => stat.fga
		),
		shootingMetric(
			'fg3Pct',
			'3P%',
			seasonGames,
			recentGames,
			(stat) => stat.fg3m,
			(stat) => stat.fg3a
		),
		shootingMetric(
			'ftPct',
			'FT%',
			seasonGames,
			recentGames,
			(stat) => stat.ftm,
			(stat) => stat.fta
		),
	];

	return {
		recentWindow,
		seasonGameCount: seasonGames.length,
		summary: developmentSummary(metrics, recentWindow, seasonGames.length),
		metrics,
	};
}

/** Same strengths, focus areas, drills, and in-season progress on player and coach views. */
export function playerImprovementFromGames(
	gameStats: SeasonGame[],
	seasonId?: string | null
): PlayerAnalysis {
	const seasonGames = gamesInSeason(gameStats, seasonId);
	const stats = derivePlayerStats(seasonGames);
	return {
		strengths: derivePlayerStrengths(stats),
		weaknesses: derivePlayerWeaknesses(stats),
		progress: playerProgressFromGames(gameStats, seasonId),
	};
}
