export type AskAiContextType = 'team' | 'player' | 'game' | 'season' | 'family' | 'general';

export type AskAiAudience = 'coach' | 'player' | 'organizer';

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
	playerId?: string;
	teamId?: string;
}

export function isPlayerPage(type: AskAiContextType) {
	return type === 'player' || type === 'family';
}

export function suggestionsFor(audience: AskAiAudience, type: AskAiContextType): string[] {
	const onPlayer = isPlayerPage(type);

	if (audience === 'player') {
		if (onPlayer) {
			return [
				'How do I explain these statistics?',
				'What do the shooting percentages mean?',
				'Summarize this season',
				'What should we work on?',
			];
		}
		if (type === 'game') {
			return [
				'How did this game go?',
				'Who stood out?',
				'What do the shooting percentages mean?',
				'How do I explain the box score?',
			];
		}
		if (type === 'team') {
			return [
				'How is the team doing?',
				'Who is playing well?',
				'What do these stats mean?',
				'How do I view the schedule?',
			];
		}
		return [
			'How do I explain these statistics?',
			'What do shooting percentages mean?',
			'How do I view the schedule?',
			'Where do I see progress?',
		];
	}

	if (audience === 'coach') {
		if (onPlayer) {
			return [
				'Summarize this player’s season',
				'What are their strengths?',
				'What should they improve?',
				'How do they compare to the team?',
			];
		}
		if (type === 'team') {
			return [
				'Who should start?',
				'Who is the 6th man?',
				'How do I run a 5-minute rotation?',
				'Summarize this team',
			];
		}
		if (type === 'game') {
			return [
				'Summarize this game',
				'Who were the top performers?',
				'What decided the outcome?',
				'Which players struggled?',
			];
		}
		return [
			'How do I explain a stat to a parent?',
			'How do I open my team’s stats?',
			'What should I look at before the next game?',
			'How do I read shooting percentages?',
		];
	}

	if (onPlayer) {
		return [
			'Summarize this player’s season',
			'How do their shooting percentages look?',
			'What should the coach focus on?',
			'How do I explain these statistics?',
		];
	}
	if (type === 'team') {
		return [
			'Summarize this team',
			'Who are the top players?',
			'How have they performed recently?',
			'How do I edit a player name?',
		];
	}
	if (type === 'game') {
		return [
			'Summarize this game',
			'Who were the top performers?',
			'What decided the outcome?',
			'Which players struggled?',
		];
	}
	if (type === 'season') {
		return [
			'Explain the standings',
			'Which teams are peaking?',
			'Who are the top scorers?',
			'Summarize the season so far',
		];
	}
	return [
		'How do I import a statsheet?',
		'How do I invite a family?',
		'How do I explain these statistics?',
		'Where do I see league stats?',
	];
}

export function resolveAskAiContext(
	params: Record<string, string>,
	pathname: string,
	audience: AskAiAudience = 'organizer'
): AskAiContext {
	const { orgSlug, seasonSlug, divisionSlug, teamSlug, jerseyNumber, gameId, playerId, teamId } =
		params;

	if (gameId && seasonSlug) {
		return {
			type: 'game',
			label: 'this game',
			suggestions: suggestionsFor(audience, 'game'),
			orgSlug,
			seasonSlug,
			gameId,
		};
	}

	if (jerseyNumber && teamSlug && divisionSlug && seasonSlug) {
		return {
			type: 'player',
			label: `Player #${jerseyNumber}`,
			suggestions: suggestionsFor(audience, 'player'),
			orgSlug,
			seasonSlug,
			divisionSlug,
			teamSlug,
			jerseyNumber,
		};
	}

	if (playerId && teamId && pathname.includes('/player-stats/')) {
		return {
			type: 'player',
			label: 'this player',
			suggestions: suggestionsFor(audience, 'player'),
			orgSlug,
			playerId,
			teamId,
		};
	}

	if (playerId && pathname.includes('/family/')) {
		return {
			type: 'family',
			label: 'your player',
			suggestions: suggestionsFor(audience, 'family'),
			orgSlug,
			playerId,
		};
	}

	if (teamSlug && divisionSlug && seasonSlug) {
		return {
			type: 'team',
			label: 'this team',
			suggestions: suggestionsFor(audience, 'team'),
			orgSlug,
			seasonSlug,
			divisionSlug,
			teamSlug,
		};
	}

	if (teamId && pathname.includes('/portal/')) {
		return {
			type: 'team',
			label: 'this team',
			suggestions: suggestionsFor(audience, 'team'),
			orgSlug,
			teamId,
		};
	}

	if (seasonSlug && pathname.includes('/seasons/')) {
		return {
			type: 'season',
			label: 'this season',
			suggestions: suggestionsFor(audience, 'season'),
			orgSlug,
			seasonSlug,
		};
	}

	return {
		type: 'general',
		label: 'GameChanger',
		suggestions: suggestionsFor(audience, 'general'),
		orgSlug,
	};
}
