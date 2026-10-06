export const AI_DATA_TOOLS = [
	{
		type: 'function' as const,
		function: {
			name: 'lookup_players',
			description:
				'Search this season for players by name, jersey number, or team. Use when they name someone who is not already in context.',
			parameters: {
				type: 'object',
				properties: {
					query: {
						type: 'string',
						description: 'Player name or jersey number, such as Maya or 12.',
					},
					team: {
						type: 'string',
						description: 'Optional team name to narrow the search, such as Red.',
					},
				},
				required: ['query'],
			},
		},
	},
	{
		type: 'function' as const,
		function: {
			name: 'get_player_stats',
			description:
				'Load season averages, shooting, ratings, and recent games for one player in this season.',
			parameters: {
				type: 'object',
				properties: {
					playerId: { type: 'string', description: 'Player id from lookup_players when you have it.' },
					name: { type: 'string', description: 'Player name if you do not have an id.' },
					jersey: { type: 'string', description: 'Jersey number, such as 12 or 04.' },
					team: { type: 'string', description: 'Team name to disambiguate the player.' },
				},
			},
		},
	},
	{
		type: 'function' as const,
		function: {
			name: 'get_team_overview',
			description:
				'Load a team record, leaders, roster averages, and recent games for this season.',
			parameters: {
				type: 'object',
				properties: {
					team: { type: 'string', description: 'Team name, such as Red or White.' },
					teamId: { type: 'string', description: 'Team id when you already have it.' },
				},
			},
		},
	},
	{
		type: 'function' as const,
		function: {
			name: 'get_game',
			description: 'Load the box score for one game in this season.',
			parameters: {
				type: 'object',
				properties: {
					gameId: { type: 'string', description: 'Game id when you already have it.' },
					team: { type: 'string', description: 'One team in the game.' },
					opponent: { type: 'string', description: 'The other team, when looking up a matchup.' },
				},
			},
		},
	},
	{
		type: 'function' as const,
		function: {
			name: 'list_games',
			description: 'List recent completed games in this season, optionally for one team.',
			parameters: {
				type: 'object',
				properties: {
					team: { type: 'string', description: 'Optional team name.' },
					limit: { type: 'integer', description: 'How many games to return. Default 8, max 15.' },
				},
			},
		},
	},
];

export function normalizeSearch(value: string) {
	return value.trim().toLowerCase().replace(/^#/, '');
}

export function matchesSearch(haystack: string, needle: string) {
	const a = normalizeSearch(haystack);
	const b = normalizeSearch(needle);
	if (!a || !b) return false;
	return a === b || a.includes(b) || b.includes(a);
}
