import { getCurrentSeason, getSeason } from '$lib/api/season.remote';
import { getOrganization } from '$lib/api/organization.remote';
import { getPlayerGameStats, getPlayerSeasonAverages } from '$lib/api/player-game-stat.remote';
import { getTeamOverview } from '$lib/api/team-overview.remote';
import { formatAiGameLine } from '$lib/ai/game-line';
import { matchesSearch, normalizeSearch } from '$lib/ai/tools';
import { gameTypeLabel } from '$lib/schemas/game';
import { db } from '$lib/server/db';
import { loadBoxScore } from '$lib/server/game-box-score.server';
import {
	formatSeasonPlayerLine,
	loadSeasonPlayerLines,
	type SeasonPlayerLine,
} from '$lib/server/season-player-directory.server';
import { averageGameRating } from '$lib/stats/game-rating';
import { trueShootingPercentage } from '$lib/utils/collection';

export type AiAskContext = {
	type: string;
	orgSlug?: string;
	seasonSlug?: string;
	teamId?: string;
	playerId?: string;
};

export type AiDataScope = {
	seasonId: string;
	seasonName: string;
};

function shootingPct(value: number | null | undefined) {
	return value == null ? 'not recorded' : `${(value * 100).toFixed(1)}%`;
}

function trueShooting(points: number, fga: number, fta: number) {
	if (fga <= 0 && fta <= 0) return 'not recorded';
	return `${(trueShootingPercentage(points, fga, fta) * 100).toFixed(1)}%`;
}

export async function resolveAiSeasonScope(context: AiAskContext): Promise<AiDataScope | null> {
	if (context.orgSlug) {
		const org = await getOrganization({ slug: context.orgSlug });
		const season = context.seasonSlug
			? await getSeason({ slug: context.seasonSlug, organizationId: org.id })
			: await getCurrentSeason({ organizationId: org.id });
		if (season) return { seasonId: season.id, seasonName: season.name };
	}

	if (context.teamId) {
		const team = await db.query.team.findFirst({
			where: { id: context.teamId },
			columns: { id: true },
			with: { division: { with: { season: { columns: { id: true, name: true } } } } },
		});
		const season = team?.division?.season;
		if (season) return { seasonId: season.id, seasonName: season.name };
	}

	if (context.playerId) {
		const player = await db.query.player.findFirst({
			where: { id: context.playerId },
			columns: { id: true },
			with: {
				team: { with: { division: { with: { season: { columns: { id: true, name: true } } } } } },
			},
		});
		const season = player?.team?.division?.season;
		if (season) return { seasonId: season.id, seasonName: season.name };
	}

	return null;
}

function pickPlayers(lines: SeasonPlayerLine[], query: string, team?: string) {
	const q = normalizeSearch(query);
	const teamQ = team ? normalizeSearch(team) : '';
	return lines
		.filter((player) => {
			if (teamQ && !matchesSearch(player.teamName, teamQ)) return false;
			return (
				matchesSearch(player.name, q) ||
				matchesSearch(player.jerseyNumber, q) ||
				matchesSearch(`${player.name} ${player.jerseyNumber}`, q)
			);
		})
		.slice(0, 8);
}

function formatLookup(players: SeasonPlayerLine[], directory: SeasonPlayerLine[]) {
	if (!players.length) return 'No matching players in this season.';
	return players.map((player) => `${player.id} ${formatSeasonPlayerLine(player, directory)}`).join('\n');
}

async function findTeam(seasonId: string, team?: string, teamId?: string) {
	if (teamId) {
		const row = await db.query.team.findFirst({
			where: { id: teamId },
			columns: { id: true, name: true, divisionId: true },
			with: { division: { columns: { seasonId: true, name: true } } },
		});
		if (row?.division?.seasonId === seasonId) return row;
		return null;
	}

	if (!team?.trim()) return null;
	const divisions = await db.query.division.findMany({
		where: { seasonId },
		columns: { id: true, name: true, seasonId: true },
		with: { teams: { columns: { id: true, name: true, divisionId: true } } },
	});
	const matches = divisions.flatMap((division) =>
		division.teams
			.filter((row) => matchesSearch(row.name, team))
			.map((row) => ({ ...row, division }))
	);
	return matches[0] ?? null;
}

async function playerStatsText(player: SeasonPlayerLine) {
	const [averages, games] = await Promise.all([
		getPlayerSeasonAverages({ playerId: player.id }),
		getPlayerGameStats({ playerId: player.id }),
	]);
	const averageRating = averageGameRating(
		games.flatMap((game) => (game.gameRating == null ? [] : [game.gameRating]))
	);
	const lines = [
		`Player: ${player.name} (#${player.jerseyNumber}) id=${player.id}`,
		`Team: ${player.teamName} · ${player.divisionName}`,
		`Games played: ${averages.gamesPlayed}`,
		`Averages: ${averages.points.toFixed(1)} PPG, ${averages.rebounds.toFixed(1)} RPG, ${averages.assists.toFixed(1)} APG, ${averages.steals.toFixed(1)} SPG, ${averages.blocks.toFixed(1)} BPG`,
		`Shooting: FG ${shootingPct(averages.fgPct)}, 3P ${shootingPct(averages.fg3Pct)}, FT ${shootingPct(averages.ftPct)}, True shooting % ${trueShooting(averages.points, averages.fga, averages.fta)}`,
	];
	if (averageRating != null) lines.push(`Average Game Rating: ${averageRating.toFixed(1)}`);
	if (games.length) {
		lines.push('All games (includes OREB, DREB, and shooting %):');
		for (const game of games) {
			lines.push(
				formatAiGameLine({
					label: game.game?.name ?? 'Game',
					pointsOnly: game.pointsOnly,
					pts: game.pts,
					reb: game.reb,
					oreb: game.oreb,
					dreb: game.dreb,
					ast: game.ast,
					stl: game.stl,
					blk: game.blk,
					tov: game.tov,
					pf: game.pf,
					fgm: game.fgm,
					fga: game.fga,
					fg3m: game.fg3m,
					fg3a: game.fg3a,
					ftm: game.ftm,
					fta: game.fta,
					fgPct: game.fgPct,
					fg3Pct: game.fg3Pct,
					ftPct: game.ftPct,
					gameRating: game.gameRating,
				})
			);
		}
	}
	return lines.join('\n');
}

async function lookupPlayers(scope: AiDataScope, args: { query?: string; team?: string }) {
	if (!args.query?.trim()) return 'Provide a player name or jersey number.';
	const directory = await loadSeasonPlayerLines(scope.seasonId);
	return formatLookup(pickPlayers(directory, args.query, args.team), directory);
}

async function getPlayerStats(
	scope: AiDataScope,
	args: { playerId?: string; name?: string; jersey?: string; team?: string }
) {
	const directory = await loadSeasonPlayerLines(scope.seasonId);
	if (args.playerId) {
		const player = directory.find((row) => row.id === args.playerId);
		if (!player) return 'That player is not in this season.';
		return playerStatsText(player);
	}

	const query = args.name?.trim() || args.jersey?.trim() || '';
	if (!query) return 'Provide a playerId, name, or jersey number.';
	const matches = pickPlayers(directory, query, args.team);
	if (!matches.length) return 'No matching players in this season.';
	if (matches.length > 1 && !args.team && !args.jersey) {
		return `Several players matched. Pick one id:\n${formatLookup(matches, directory)}`;
	}
	return playerStatsText(matches[0]);
}

async function getTeamOverviewText(
	scope: AiDataScope,
	args: { team?: string; teamId?: string }
) {
	const team = await findTeam(scope.seasonId, args.team, args.teamId);
	if (!team) return 'No matching team in this season.';
	const overview = await getTeamOverview({
		teamId: team.id,
		divisionId: team.divisionId,
		seasonId: scope.seasonId,
	});
	const lines = [
		`Team: ${team.name} id=${team.id}`,
		`Record: ${overview.record.wins}-${overview.record.losses}`,
		`PPG: ${overview.ppg.toFixed(1)} | Opp PPG: ${overview.oppPpg.toFixed(1)}`,
	];
	if (overview.rank) lines.push(`Rank before playoffs: #${overview.rank}`);
	if (overview.divisionPlace) lines.push(`Season place: ${overview.divisionPlace}`);
	if (overview.leaders.length) {
		lines.push('Leaders:');
		for (const leader of overview.leaders) {
			if (!leader.player) continue;
			lines.push(
				`- ${leader.label}: ${leader.player.name} (#${leader.player.jerseyNumber}) ${leader.player.value.toFixed(1)} ${leader.suffix}`
			);
		}
	}
	if (overview.recentGames.length) {
		lines.push('Recent games:');
		for (const game of overview.recentGames.slice(0, 8)) {
			const type = gameTypeLabel(game.gameType);
			if (game.defaultResult) {
				lines.push(`- ${game.defaultResult} vs ${game.opponentName} (${type})`);
				continue;
			}
			lines.push(`- ${game.result} ${game.teamScore}-${game.oppScore} vs ${game.opponentName} (${type})`);
		}
	}
	return lines.join('\n');
}

async function listGames(scope: AiDataScope, args: { team?: string; limit?: number }) {
	const limit = Math.min(Math.max(args.limit ?? 8, 1), 15);
	const games = await db.query.game.findMany({
		where: { seasonId: scope.seasonId },
		columns: {
			id: true,
			name: true,
			status: true,
			gameType: true,
			completedAt: true,
			scheduledAt: true,
			homeTeamScore: true,
			awayTeamScore: true,
			homeTeamId: true,
			awayTeamId: true,
		},
		with: {
			homeTeam: { columns: { id: true, name: true } },
			awayTeam: { columns: { id: true, name: true } },
		},
		orderBy: { completedAt: 'desc' },
	});

	const team = args.team?.trim();
	const filtered = games.filter((game) => {
		if (game.status !== 'completed') return false;
		if (!team) return true;
		return matchesSearch(game.homeTeam.name, team) || matchesSearch(game.awayTeam.name, team);
	});

	if (!filtered.length) return 'No matching games in this season.';

	return filtered
		.slice(0, limit)
		.map((game) => {
			const type = gameTypeLabel(game.gameType);
			const at = game.completedAt ?? game.scheduledAt;
			const when = at ? at.toISOString().slice(0, 10) : 'undated';
			return `- ${game.id} ${game.awayTeam.name} ${game.awayTeamScore ?? 0}–${game.homeTeamScore ?? 0} ${game.homeTeam.name} (${type}, ${when}) ${game.name}`;
		})
		.join('\n');
}

async function getGameText(
	scope: AiDataScope,
	args: { gameId?: string; team?: string; opponent?: string }
) {
	let gameId = args.gameId?.trim();
	if (!gameId) {
		const listed = await listGames(scope, { team: args.team, limit: 15 });
		if (!args.team && !args.opponent) return listed;
		const games = await db.query.game.findMany({
			where: { seasonId: scope.seasonId, status: 'completed' },
			columns: { id: true, homeTeamId: true, awayTeamId: true },
			with: {
				homeTeam: { columns: { name: true } },
				awayTeam: { columns: { name: true } },
			},
			orderBy: { completedAt: 'desc' },
		});
		const matches = games.filter((game) => {
			const teams = [game.homeTeam.name, game.awayTeam.name];
			if (args.team && !teams.some((name) => matchesSearch(name, args.team!))) return false;
			if (args.opponent && !teams.some((name) => matchesSearch(name, args.opponent!))) return false;
			return true;
		});
		if (!matches.length) return 'No matching game in this season.';
		if (matches.length > 1 && !args.opponent) {
			return `Several games matched. Call get_game with a gameId:\n${listed}`;
		}
		gameId = matches[0].id;
	}

	const box = await loadBoxScore(gameId);
	if (box.seasonId !== scope.seasonId) return 'That game is not in this season.';

	const lines = [
		`Game: ${box.awayTeam.name} ${box.awayTeam.score} – ${box.homeTeam.score} ${box.homeTeam.name}`,
		`Type: ${gameTypeLabel(box.gameType)}`,
	];
	if (box.mvp?.kind === 'mvp' && box.mvp.players[0]) {
		const player = box.mvp.players[0];
		lines.push(
			`Official Player of the Game: #${player.jerseyNumber} ${player.name} — ${player.gameRating?.toFixed(1)}`
		);
	}
	for (const side of [box.awayTeam, box.homeTeam]) {
		lines.push(`${side.name}:`);
		for (const player of side.players) {
			lines.push(
				formatAiGameLine({
					label: `#${player.jerseyNumber} ${player.name}`,
					pointsOnly: player.pointsOnly,
					pts: player.pts,
					reb: player.reb,
					oreb: player.oreb,
					dreb: player.dreb,
					ast: player.ast,
					stl: player.stl,
					blk: player.blk,
					tov: player.tov,
					pf: player.pf,
					fgm: player.fgm,
					fga: player.fga,
					fg3m: player.fg3m,
					fg3a: player.fg3a,
					ftm: player.ftm,
					fta: player.fta,
					fgPct: player.fgPct,
					fg3Pct: player.fg3Pct,
					ftPct: player.ftPct,
					gameRating: player.gameRating,
				})
			);
		}
	}
	return lines.join('\n');
}

export async function runAiDataTool(
	name: string,
	rawArgs: string,
	scope: AiDataScope | null
): Promise<string> {
	if (!scope) return 'No season is in scope for a database lookup.';

	let args: Record<string, unknown> = {};
	try {
		args = rawArgs.trim() ? (JSON.parse(rawArgs) as Record<string, unknown>) : {};
	} catch {
		return 'Could not read that lookup.';
	}

	const text = (key: string) => {
		const value = args[key];
		return typeof value === 'string' ? value : undefined;
	};
	const number = (key: string) => {
		const value = args[key];
		return typeof value === 'number' ? value : undefined;
	};

	try {
		if (name === 'lookup_players') return await lookupPlayers(scope, { query: text('query'), team: text('team') });
		if (name === 'get_player_stats') {
			return await getPlayerStats(scope, {
				playerId: text('playerId'),
				name: text('name'),
				jersey: text('jersey'),
				team: text('team'),
			});
		}
		if (name === 'get_team_overview') {
			return await getTeamOverviewText(scope, { team: text('team'), teamId: text('teamId') });
		}
		if (name === 'get_game') {
			return await getGameText(scope, {
				gameId: text('gameId'),
				team: text('team'),
				opponent: text('opponent'),
			});
		}
		if (name === 'list_games') return await listGames(scope, { team: text('team'), limit: number('limit') });
		return 'Unknown lookup.';
	} catch {
		return 'That lookup failed.';
	}
}
