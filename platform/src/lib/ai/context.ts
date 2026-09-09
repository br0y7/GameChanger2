export type AskAiContextType = 'team' | 'player' | 'game' | 'season' | 'general';

export interface AskAiContext {
	type: AskAiContextType;
	label: string;
	suggestions: string[];
	orgSlug?: string;
	seasonSlug?: string;
	divisionSlug?: string;
	teamSlug?: string;
	jerseyNumber?: string;
	gameId?: string;
}

export function resolveAskAiContext(params: Record<string, string>, pathname: string): AskAiContext {
	const { orgSlug, seasonSlug, divisionSlug, teamSlug, jerseyNumber, gameId } = params;

	if (gameId && seasonSlug) {
		return {
			type: 'game',
			label: 'this game',
			suggestions: [
				'Summarize this game',
				'Who were the top performers?',
				'What decided the outcome?',
				'Which players struggled?',
			],
			orgSlug,
			seasonSlug,
			gameId,
		};
	}

	if (jerseyNumber && teamSlug && divisionSlug && seasonSlug) {
		return {
			type: 'player',
			label: `Player #${jerseyNumber}`,
			suggestions: [
				'Summarize this player’s season',
				'What are their strengths?',
				'What should they improve?',
				'How consistent have they been?',
			],
			orgSlug,
			seasonSlug,
			divisionSlug,
			teamSlug,
			jerseyNumber,
		};
	}

	if (teamSlug && divisionSlug && seasonSlug) {
		return {
			type: 'team',
			label: 'this team',
			suggestions: [
				'Summarize this team',
				'Who are the top players?',
				'What should this team improve?',
				'How have they performed recently?',
			],
			orgSlug,
			seasonSlug,
			divisionSlug,
			teamSlug,
		};
	}

	if (seasonSlug && pathname.includes('/seasons/')) {
		return {
			type: 'season',
			label: 'this season',
			suggestions: [
				'Explain the standings',
				'Which teams are peaking?',
				'Who are the top scorers?',
				'Summarize the season so far',
			],
			orgSlug,
			seasonSlug,
		};
	}

	return {
		type: 'general',
		label: 'GameChanger',
		suggestions: [
			'How do I import a statsheet?',
			'What stats does GameChanger track?',
			'How are season averages calculated?',
			'Help me understand shooting percentages',
		],
		orgSlug,
	};
}
