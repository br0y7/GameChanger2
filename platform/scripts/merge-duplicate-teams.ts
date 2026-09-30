import { SQL } from 'bun';
import { preferredTeamName, teamMatchKey } from '../src/lib/import/team-match';
import { slugify } from '../src/lib/utils/string';

type TeamRow = {
	id: string;
	division_id: string;
	division: string;
	name: string;
	games: number;
	players: number;
};

const sql = new SQL(process.env.DATABASE_URL!);

const teams = (await sql`
	SELECT d.name AS division, d.id AS division_id, t.id, t.name,
		(SELECT count(*)::int FROM game g WHERE g.home_team_id = t.id OR g.away_team_id = t.id) AS games,
		(SELECT count(*)::int FROM player p WHERE p.team_id = t.id) AS players
	FROM team t
	JOIN division d ON d.id = t.division_id
`) as TeamRow[];

const groups = new Map<string, TeamRow[]>();
for (const team of teams) {
	const key = `${team.division_id}|${teamMatchKey(team.name)}`;
	const list = groups.get(key) ?? [];
	list.push(team);
	groups.set(key, list);
}

const merges = [...groups.values()].filter((group) => group.length > 1);

await sql.begin(async (tx) => {
	for (const group of merges) {
		const ranked = [...group].sort(
			(a, b) => b.games - a.games || b.players - a.players || a.name.length - b.name.length
		);
		const keeper = ranked[0]!;
		const duplicates = ranked.slice(1);
		const name = preferredTeamName(group.map((team) => team.name));
		const slug = slugify(name);

		for (const duplicate of duplicates) {
			await tx`UPDATE game SET home_team_id = ${keeper.id} WHERE home_team_id = ${duplicate.id}`;
			await tx`UPDATE game SET away_team_id = ${keeper.id} WHERE away_team_id = ${duplicate.id}`;
			await tx`UPDATE coach SET team_id = ${keeper.id} WHERE team_id = ${duplicate.id}`;

			const dupPlayers = (await tx`
				SELECT id, jersey_number FROM player WHERE team_id = ${duplicate.id}
			`) as { id: string; jersey_number: string }[];

			for (const player of dupPlayers) {
				const [existing] = (await tx`
					SELECT id FROM player
					WHERE team_id = ${keeper.id} AND jersey_number = ${player.jersey_number}
					LIMIT 1
				`) as { id: string }[];

				if (!existing) {
					await tx`UPDATE player SET team_id = ${keeper.id} WHERE id = ${player.id}`;
					continue;
				}

				await tx`
					UPDATE player_game_stat
					SET player_id = ${existing.id}
					WHERE player_id = ${player.id}
					AND game_id NOT IN (
						SELECT game_id FROM player_game_stat WHERE player_id = ${existing.id}
					)
				`;
				await tx`DELETE FROM player_game_stat WHERE player_id = ${player.id}`;
				await tx`
					UPDATE player_coach_note
					SET player_id = ${existing.id}
					WHERE player_id = ${player.id}
					AND NOT EXISTS (
						SELECT 1 FROM player_coach_note WHERE player_id = ${existing.id}
					)
				`;
				await tx`UPDATE player_follower SET player_id = ${existing.id} WHERE player_id = ${player.id}`;
				await tx`DELETE FROM player WHERE id = ${player.id}`;
			}

			await tx`DELETE FROM team WHERE id = ${duplicate.id}`;
			console.log(
				`${keeper.division}: merged "${duplicate.name}" into "${name}" (was "${keeper.name}")`
			);
		}

		await tx`UPDATE team SET name = ${name}, slug = ${slug} WHERE id = ${keeper.id}`;
	}
});

console.log(`Merged ${merges.length} team groups.`);
process.exit(0);
