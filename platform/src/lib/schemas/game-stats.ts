export const gameStatsStatuses = ['none', 'draft', 'submitted', 'published'] as const;
export type GameStatsStatus = (typeof gameStatsStatuses)[number];

export const GAME_STATS_STATUS = {
	none: 'none',
	draft: 'draft',
	submitted: 'submitted',
	published: 'published',
} as const satisfies Record<GameStatsStatus, GameStatsStatus>;

export const gameStatsStatusLabels: Record<GameStatsStatus, string> = {
	none: 'No stats',
	draft: 'Draft',
	submitted: 'Submitted',
	published: 'Published',
};
