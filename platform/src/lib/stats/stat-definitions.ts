/** Hover definitions for basketball stats shown in the UI. */
export const STAT_DEFINITIONS: Record<string, string> = {
	PTS: 'Points scored per game on average.',
	Points: 'Points scored per game on average.',
	REB: 'Total rebounds per game (offensive + defensive).',
	Rebounds: 'Total rebounds per game (offensive + defensive).',
	AST: 'Assists per game — passes that lead directly to a teammate’s score.',
	Assists: 'Assists per game — passes that lead directly to a teammate’s score.',
	STL: 'Steals per game — times the player took the ball from the other team.',
	BLK: 'Blocks per game — shots rejected at the rim or elsewhere.',
	TO: 'Turnovers per game — times the player lost possession.',
	TOV: 'Turnovers per game — times the player lost possession.',
	OREB: 'Offensive rebounds per game — boards on the team’s own missed shots.',
	DREB: 'Defensive rebounds per game — boards on the opponent’s missed shots.',
	FGM: 'Field goals made per game (2-pointers and 3-pointers).',
	FGA: 'Field goal attempts per game.',
	FG: 'Field goals made–attempted (2-pointers and 3-pointers).',
	'FG%': 'Field goal percentage — makes ÷ attempts for the season (not an average of game %).',
	'3PM': 'Three-pointers made per game.',
	'3PA': 'Three-point attempts per game.',
	'3P': 'Three-pointers made–attempted.',
	'3P%': 'Three-point percentage — makes ÷ attempts for the season.',
	FTM: 'Free throws made per game.',
	FTA: 'Free throw attempts per game.',
	FT: 'Free throws made–attempted.',
	'FT%': 'Free throw percentage — makes ÷ attempts for the season.',
	PF: 'Personal fouls per game.',
	EFF: 'Efficiency — PTS + REB + AST + STL + BLK − (TO + PF), averaged per game.',
};

export function getStatDefinition(label: string): string {
	return STAT_DEFINITIONS[label] ?? STAT_DEFINITIONS[label.toUpperCase()] ?? '';
}
