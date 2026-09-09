import { command, form } from '$app/server';
import * as xlsx from 'xlsx';
import { serverLogger } from '$lib/server/logger';
import { error, invalid } from '@sveltejs/kit';
import {
	savePreviewSchema,
	uploadSpreadsheetSchema,
	type GamePreview,
	type PlayerGameStatsPreview,
	type SpreadsheetPreview,
	type TeamPreview,
} from '$lib/schemas/preview';
import {
	SpreadsheetParserError,
	type SpreadsheetParser,
	type SpreadsheetParserVersion,
} from '$lib/parsers/base';
import { spreadsheetParserV1 } from '$lib/parsers/v1.server';
import { getTeams } from './team.remote';
import type { Player, Team } from '$lib/server/db/schema';
import { requireAdmin } from './auth.remote';
import { notFound } from '$lib/server/fail';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { slugify } from '$lib/utils/string';
import { and, eq } from 'drizzle-orm';
import { rawStatKeys } from '$lib/schemas/player-game-stat';
import { idField } from '$lib/schemas/common';
import { z } from 'zod';

async function annotatePlayers(playerPreviews: PlayerGameStatsPreview[], players: Player[]) {
	const playerMap = new Map<string, Player>();

	for (const player of players) {
		if (player.jerseyNumber) {
			playerMap.set(player.jerseyNumber, player);
		}
	}

	for (const playerPreview of playerPreviews) {
		if (playerPreview.jerseyNumber && playerMap.has(playerPreview.jerseyNumber)) {
			playerPreview._status = 'update';
			playerPreview.playerId = playerMap.get(playerPreview.jerseyNumber)?.id;
		}
	}
}

async function annotatePreview(preview: SpreadsheetPreview, divisionId: string) {
	const teams = await getTeams({ divisionId, include: { players: true } });

	for (const game of preview.games) {
		const homeTeam = teams.find((team) => team.name === game.homeTeam.name);

		if (homeTeam) {
			game.homeTeam._status = 'update';
			game.homeTeam.id = homeTeam.id;

			await annotatePlayers(game.homeTeam.playerStats, homeTeam.players);
		}

		const awayTeam = teams.find((team) => team.name === game.awayTeam.name);

		if (awayTeam) {
			game.awayTeam._status = 'update';
			game.awayTeam.id = awayTeam.id;

			await annotatePlayers(game.awayTeam.playerStats, awayTeam.players);
		}
	}

	return preview;
}

export const previewSpreadsheet = form(
	uploadSpreadsheetSchema,
	async ({ spreadsheet, version, timeZone, divisionId }) => {
		const admin = await requireAdmin();

		try {
			const parsers: Record<SpreadsheetParserVersion, SpreadsheetParser> = {
				v1: spreadsheetParserV1,
			};
			const buffer = await spreadsheet.arrayBuffer();
			const preview = parsers[version].parse(xlsx.read(buffer), { timeZone });

			await annotatePreview(preview, divisionId);

			serverLogger.info('uploaded for preview', { file: spreadsheet.name, admin: admin.id });

			return preview;
		} catch (err) {
			if (err instanceof SpreadsheetParserError) {
				serverLogger.error(err);
				return invalid(`Parser error ${err.message}`);
			}

			serverLogger.error(err);
			return invalid('Something went wrong');
		}
	}
);

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function saveTeam(tx: Transaction, teamPreview: TeamPreview, divisionId: string) {
	if (teamPreview.id && teamPreview._status === 'update') {
		return await tx.query.team.findFirst({ where: { id: teamPreview.id } });
	}

	const { name } = teamPreview;
	const slug = slugify(name);
	// Check first if a previous iteration already made the team
	// in the current transaction
	const team = await tx.query.team.findFirst({ where: { slug, divisionId } });
	if (team) {
		return team;
	}

	const [created] = await tx.insert(table.team).values({ divisionId, name, slug }).returning();
	return created;
}

async function saveGame(
	tx: Transaction,
	homeTeam: Team,
	awayTeam: Team,
	gamePreview: GamePreview,
	seasonId: string
) {
	// does game exist already?
	const game = await db.query.game.findFirst({
		where: {
			homeTeamId: homeTeam.id,
			awayTeamId: awayTeam.id,
		},
	});

	if (game) {
		return { id: game.id };
	}

	const [createdGame] = await tx
		.insert(table.game)
		.values({
			seasonId,
			homeTeamId: homeTeam.id,
			awayTeamId: awayTeam.id,
			name: `${homeTeam.name} vs ${awayTeam.name}`,
			completedAt: gamePreview.completedAt,
			homeTeamScore: gamePreview.homeTeam.score,
			awayTeamScore: gamePreview.awayTeam.score,
			status: 'completed',
		})
		.returning({ id: table.game.id });

	return createdGame;
}

async function saveStats(tx: Transaction, data: TeamPreview, team: Team, gameId: string) {
	for (const playerPreview of data.playerStats) {
		const { jerseyNumber, stats: rawStats } = playerPreview;

		if (!jerseyNumber) {
			notFound({ resource: 'player' }, { message: 'No jersey number while trying to save stats.' });
		}

		const stats = Object.fromEntries(
			rawStatKeys.map((key) => [key, Number(rawStats?.[key]) || 0])
		) as typeof rawStats;

		// Skip players who appear with no recorded stats (not actually on the sheet box score)
		const hasAnyStat = rawStatKeys.some((key) => Number(stats?.[key]) > 0);
		if (!hasAnyStat) {
			continue;
		}

		let player = await tx.query.player.findFirst({
			where: {
				teamId: team.id,
				jerseyNumber,
			},
		});

		if (!player) {
			const [created] = await tx
				.insert(table.player)
				.values({
					name: `Player #${jerseyNumber}`,
					jerseyNumber: jerseyNumber,
					teamId: team.id,
				})
				.returning();

			player = created;
		}

		const playerId = player.id;

		const gameStats = await tx.query.playerGameStat.findFirst({
			where: {
				playerId,
				gameId,
			},
		});

		if (gameStats) {
			await tx
				.update(table.playerGameStat)
				.set(stats)
				.where(
					and(eq(table.playerGameStat.gameId, gameId), eq(table.playerGameStat.playerId, playerId))
				);
		} else {
			await tx.insert(table.playerGameStat).values({ ...stats, gameId, playerId });
		}
	}
}

function formatSaveValidationIssues(
	games: GamePreview[],
	issues: { path: PropertyKey[]; message: string }[]
) {
	return issues
		.map((issue) => {
			const path = issue.path.map(String);
			const gameIndex = path[0] === 'games' ? Number(path[1]) : NaN;
			const game = Number.isInteger(gameIndex) ? games[gameIndex] : undefined;

			const parts: string[] = [];
			if (game) {
				parts.push(`Game: ${game.name}`);
			} else if (Number.isInteger(gameIndex)) {
				parts.push(`Game #${gameIndex + 1}`);
			}

			if (path[2] === 'homeTeam' || path[2] === 'awayTeam') {
				const side = path[2] === 'homeTeam' ? 'Home' : 'Away';
				const team = path[2] === 'homeTeam' ? game?.homeTeam : game?.awayTeam;
				parts.push(`Team: ${team?.name ?? side}`);
			}

			if (path[3] === 'playerStats' && path[4] !== undefined) {
				const playerIndex = Number(path[4]);
				const side = path[2] === 'homeTeam' ? game?.homeTeam : game?.awayTeam;
				const player = side?.playerStats?.[playerIndex];
				const jersey = player?.jerseyNumber ? `#${player.jerseyNumber}` : `row ${playerIndex + 1}`;
				parts.push(`Player: ${jersey}`);
			}

			if (path.length > 0) {
				const field = path.at(-1);
				if (field && field !== 'games' && !String(field).match(/^\d+$/)) {
					parts.push(`Field: ${String(field)}`);
				}
			}

			parts.push(issue.message);
			return parts.join(' — ');
		})
		.join('\n');
}

export const savePreview = command(
	z.object({
		games: z.array(z.any()),
		divisionId: idField,
	}),
	async ({ games, divisionId }) => {
		const admin = await requireAdmin();

		const parsed = savePreviewSchema.safeParse({ games, divisionId });
		if (!parsed.success) {
			const details = formatSaveValidationIssues(
				games as GamePreview[],
				parsed.error.issues.map((issue) => ({ path: issue.path, message: issue.message }))
			);
			serverLogger.error('save preview validation failed', details);
			error(400, details || 'Invalid statsheet data');
		}

		const division = await db.query.division.findFirst({
			where: { id: parsed.data.divisionId },
			with: { season: true },
		});

		if (!division) {
			notFound({ resource: 'division', id: divisionId });
		}

		try {
			await db.transaction(async (tx) => {
				if (!division.season) {
					notFound({ resource: 'season' });
				}

				for (const game of parsed.data.games) {
					try {
						const homeTeam = await saveTeam(tx, game.homeTeam, divisionId);
						const awayTeam = await saveTeam(tx, game.awayTeam, divisionId);

						if (!homeTeam || !awayTeam) {
							notFound({ resource: 'team' });
						}

						const { id: gameId } = await saveGame(
							tx,
							homeTeam,
							awayTeam,
							game,
							division.season.id
						);

						await saveStats(tx, game.homeTeam, homeTeam, gameId);
						await saveStats(tx, game.awayTeam, awayTeam, gameId);
					} catch (err) {
						const message = err instanceof Error ? err.message : 'Unknown save error';
						throw new Error(`[Game: ${game.name}] ${message}`, { cause: err });
					}
				}
			});

			serverLogger.info('saved stats', { admin: admin.id });
		} catch (err) {
			serverLogger.error(err);
			throw err;
		}
	}
);
