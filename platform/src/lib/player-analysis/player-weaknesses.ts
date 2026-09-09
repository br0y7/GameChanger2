import type { PlayerAnalysisStat, PlayerWeakness, RuleFor } from '$lib/schemas/player-analysis';
import type { PlayerStats } from '$lib/schemas/player-stats';

function avgStat(
	label: string,
	value: number | undefined,
	format: 'number' | 'percent' = 'number'
): PlayerAnalysisStat {
	const n = value ?? 0;
	return {
		label,
		value: n,
		display:
			format === 'percent'
				? `${(n * 100).toLocaleString('en-US', { maximumFractionDigits: 0 })}%`
				: n.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
	};
}

function totalStat(label: string, value: number | undefined): PlayerAnalysisStat {
	const n = value ?? 0;
	return {
		label,
		value: n,
		display: n.toLocaleString('en-US', { maximumFractionDigits: 0 }),
	};
}

type WeaknessRule = RuleFor<Omit<PlayerWeakness, 'stat'>> & {
	stat: (stats: PlayerStats) => PlayerAnalysisStat;
};

export const PLAYER_WEAKNESSES_WITH_RULES: WeaknessRule[] = [
	{
		category: 'dribbling',
		description: 'High turnover rate',
		applies: (stats) => (stats.raw.tov.average ?? 0) >= 4,
		stat: (stats) => avgStat('TOV', stats.raw.tov.average),
	},
	{
		category: 'dribbling',
		description: 'Ball control',
		applies: (stats) => {
			const tov = stats.raw.tov.average ?? 0;
			return tov >= 2.5 && tov < 4;
		},
		stat: (stats) => avgStat('TOV', stats.raw.tov.average),
	},
	{
		category: 'shooting',
		description: 'Field goal percentage',
		applies: (stats) => (stats.derived.fgPct.average ?? 0) < 0.35,
		stat: (stats) => avgStat('FG%', stats.derived.fgPct.average, 'percent'),
	},
	{
		category: 'three-point-shooting',
		description: 'Three-point shooting accuracy',
		applies: (stats) => {
			const fg3Pct = stats.derived.fg3Pct.average ?? 0;
			return fg3Pct > 0 && fg3Pct < 0.25;
		},
		stat: (stats) => avgStat('3P%', stats.derived.fg3Pct.average, 'percent'),
	},
	{
		category: 'free-throw-shooting',
		description: 'Free throw shooting',
		applies: (stats) => {
			const ftPct = stats.derived.ftPct.average ?? 0;
			return ftPct > 0 && ftPct < 0.25;
		},
		stat: (stats) => avgStat('FT%', stats.derived.ftPct.average, 'percent'),
	},
	{
		category: 'rebounding',
		description: 'Rebounding',
		applies: (stats) => (stats.derived.reb.total ?? 0) < 3,
		stat: (stats) => totalStat('REB', stats.derived.reb.total),
	},
	{
		category: 'passing',
		description: 'Passing',
		applies: (stats) => (stats.raw.ast.total ?? 0) < 2,
		stat: (stats) => totalStat('AST', stats.raw.ast.total),
	},
];

export const derivePlayerWeaknesses = (stats: PlayerStats): PlayerWeakness[] =>
	PLAYER_WEAKNESSES_WITH_RULES.filter((rule) => rule.applies(stats)).map(
		({ category, description, stat }) => ({
			category,
			description,
			stat: stat(stats),
		})
	);
