import type { PlayerAnalysisStat, PlayerStrength, RuleFor } from '$lib/schemas/player-analysis';
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

type StrengthRule = RuleFor<Omit<PlayerStrength, 'stat'>> & {
	stat: (stats: PlayerStats) => PlayerAnalysisStat;
};

export const PLAYER_STRENGTHS_WITH_RULES: StrengthRule[] = [
	{
		description: 'Scoring ability',
		applies: (stats) => (stats.derived.pts.average ?? 0) >= 15,
		stat: (stats) => avgStat('PPG', stats.derived.pts.average),
	},
	{
		description: 'Solid scoring',
		applies: (stats) => {
			const points = stats.derived.pts.average ?? 0;
			return points >= 10 && points < 15;
		},
		stat: (stats) => avgStat('PPG', stats.derived.pts.average),
	},
	{
		description: 'Strong rebounding',
		applies: (stats) => (stats.derived.reb.average ?? 0) >= 8,
		stat: (stats) => avgStat('RPG', stats.derived.reb.average),
	},
	{
		description: 'Good rebounding',
		applies: (stats) => {
			const rebounds = stats.derived.reb.average ?? 0;
			return rebounds >= 5 && rebounds < 8;
		},
		stat: (stats) => avgStat('RPG', stats.derived.reb.average),
	},
	{
		description: 'Playmaking and ball distribution',
		applies: (stats) => (stats.raw.ast.average ?? 0) >= 5,
		stat: (stats) => avgStat('APG', stats.raw.ast.average),
	},
	{
		description: 'Good passing',
		applies: (stats) => {
			const assists = stats.raw.ast.average ?? 0;
			return assists >= 3 && assists < 5;
		},
		stat: (stats) => avgStat('APG', stats.raw.ast.average),
	},
	{
		description: 'Efficient field goal shooting',
		applies: (stats) => (stats.derived.fgPct.average ?? 0) >= 0.45,
		stat: (stats) => avgStat('FG%', stats.derived.fgPct.average, 'percent'),
	},
	{
		description: 'Three-point shooting',
		applies: (stats) => (stats.derived.fg3Pct.average ?? 0) >= 0.35,
		stat: (stats) => avgStat('3P%', stats.derived.fg3Pct.average, 'percent'),
	},
	{
		description: 'Free throw shooting',
		applies: (stats) => (stats.derived.ftPct.average ?? 0) >= 0.75,
		stat: (stats) => avgStat('FT%', stats.derived.ftPct.average, 'percent'),
	},
	{
		description: 'Defensive playmaking (steals)',
		applies: (stats) => (stats.raw.stl.average ?? 0) >= 2,
		stat: (stats) => avgStat('SPG', stats.raw.stl.average),
	},
	{
		description: 'Shot blocking',
		applies: (stats) => (stats.raw.blk.average ?? 0) >= 1,
		stat: (stats) => avgStat('BPG', stats.raw.blk.average),
	},
];

export const derivePlayerStrengths = (stats: PlayerStats): PlayerStrength[] =>
	PLAYER_STRENGTHS_WITH_RULES.filter((rule) => rule.applies(stats)).map(
		({ description, stat }) => ({
			description,
			stat: stat(stats),
		})
	);
