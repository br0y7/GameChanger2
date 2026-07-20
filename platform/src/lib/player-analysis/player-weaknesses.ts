import type { PlayerWeakness, RuleFor } from '$lib/schemas/player-analysis';
import type { PlayerStats } from '$lib/schemas/player-stats';

export const PLAYER_WEAKNESSES_WITH_RULES: RuleFor<PlayerWeakness>[] = [
	{
		category: 'dribbling',
		description: 'High turnover rate',
		applies: (stats) => (stats.raw.tov.average ?? 0) >= 4,
	},
	{
		category: 'dribbling',
		description: 'Ball control',
		applies: (stats) => {
			const tov = stats.raw.tov.average ?? 0;
			return tov >= 2.5 && tov < 4;
		},
	},
	{
		category: 'shooting',
		description: 'Field goal percentage',
		applies: (stats) => (stats.derived.fgPct.average ?? 0) < 0.35,
	},
	{
		category: 'three-point-shooting',
		description: 'Three-point shooting accuracy',
		applies: (stats) => {
			const fg3Pct = stats.derived.fg3Pct.average ?? 0;

			return fg3Pct > 0 && fg3Pct < 0.25;
		},
	},
	{
		category: 'free-throw-shooting',
		description: 'Free throw shooting',
		applies: (stats) => {
			const ftPct = stats.derived.ftPct.average ?? 0;

			return ftPct > 0 && ftPct < 0.25;
		},
	},
	{
		category: 'rebounding',
		description: 'Rebounding',
		applies: (stats) => stats.derived.reb.total < 3,
	},
	{
		category: 'passing',
		description: 'Rebounding',
		applies: (stats) => stats.raw.ast.total < 2,
	},
];

export const derivePlayerWeaknesses = (stats: PlayerStats): PlayerWeakness[] =>
	PLAYER_WEAKNESSES_WITH_RULES.filter((rule) => rule.applies(stats)).map(
		({ category, description }) => ({ category, description })
	);
