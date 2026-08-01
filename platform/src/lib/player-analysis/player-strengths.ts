import type { PlayerStrength, RuleFor } from '$lib/schemas/player-analysis';
import type { PlayerStats } from '$lib/schemas/player-stats';

export const PLAYER_STRENGTHS_WITH_RULES: RuleFor<PlayerStrength>[] = [
	{
		description: 'Scoring ability',
		applies: (stats) => (stats.derived.pts.average ?? 0) >= 15,
	},
	{
		description: 'Solid scoring',
		applies: (stats) => {
			const points = stats.derived.pts.average ?? 0;

			return points >= 10 && points < 15;
		},
	},
	{
		description: 'Strong rebounding',
		applies: (stats) => (stats.derived.reb.average ?? 0) >= 8,
	},
	{
		description: 'Good rebounding',
		applies: (stats) => {
			const rebounds = stats.derived.reb.average ?? 0;

			return rebounds >= 5 && rebounds < 8;
		},
	},
	{
		description: 'Playmaking and ball distribution',
		applies: (stats) => (stats.raw.ast.average ?? 0) >= 5,
	},
	{
		description: 'Good passing',
		applies: (stats) => {
			const assists = stats.raw.ast.average ?? 0;

			return assists >= 3 && assists < 5;
		},
	},
	{
		description: 'Efficient field goal shooting',
		applies: (stats) => (stats.derived.fgPct.average ?? 0) >= 0.45,
	},
	{
		description: 'Three-point shooting',
		applies: (stats) => (stats.derived.fg3Pct.average ?? 0) >= 0.35,
	},
	{
		description: 'Free throw shooting',
		applies: (stats) => (stats.derived.ftPct.average ?? 0) >= 0.75,
	},
	{
		applies: (stats) => (stats.raw.stl.average ?? 0) >= 2,
		description: 'Defensive playmaking (steals)',
	},
	{
		applies: (stats) => (stats.raw.blk.average ?? 0) >= 1,
		description: 'Shot blocking',
	},
];

export const derivePlayerStrengths = (stats: PlayerStats): PlayerStrength[] =>
	PLAYER_STRENGTHS_WITH_RULES.filter((rule) => rule.applies(stats)).map(({ description }) => ({
		description,
	}));
