export type PrePlayoffStandingRow = {
	rank: number;
	name: string;
	wins: number;
	losses: number;
	ties: number;
};

export type PrePlayoffDivision = {
	name: string;
	rows: PrePlayoffStandingRow[];
};

function recordLabel(row: PrePlayoffStandingRow) {
	return row.ties > 0 ? `${row.wins}-${row.losses}-${row.ties}` : `${row.wins}-${row.losses}`;
}

/** Regular-season order for every division. This is the ranking before playoffs. */
export function formatPrePlayoffStandings(divisions: PrePlayoffDivision[]) {
	if (!divisions.length) return '';
	const lines = [
		'Rankings before playoffs (regular season only). Use this when they ask for standings, who is in first, or where a team ranks. Do not use playoff Place for these ranks.',
	];
	for (const division of divisions) {
		lines.push(`${division.name}:`);
		if (!division.rows.length) {
			lines.push('- No teams');
			continue;
		}
		for (const row of division.rows) {
			lines.push(`- #${row.rank} ${row.name} ${recordLabel(row)}`);
		}
	}
	return lines.join('\n');
}
