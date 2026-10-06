import { command, form } from '$app/server';
import * as xlsx from 'xlsx';
import { serverLogger } from '$lib/server/logger';
import { error, invalid, isHttpError } from '@sveltejs/kit';
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
import { publishScheduleChange } from '$lib/server/dashboard-sync.server';
import { calendarDay, staleDivisionGameIds } from '$lib/import/game-identity';
import { correctFalsePlayoffTypes } from '$lib/stats/matchup';
import { isPostseasonGameType, resolveImportedGameType } from '$lib/schemas/game';
import { pickExistingTeam, readableTeamName, isJerseyNumberTeamName } from '$lib/import/team-match';
import { slugify } from '$lib/utils/string';
import { eq, inArray } from 'drizzle-orm';
import { rawStatKeys } from '$lib/schemas/player-game-stat';
import { type CountingLine } from '$lib/stats/game-rating';
import {
	loadApplicableScale,
	ratingPatch,
	recalibrateOrganizationRatings,
	type ApplicableScale,
} from '$lib/server/game-rating.server';
import { clearedRating } from '$lib/stats/game-rating';
import { isPointsOnlyLine, playerAppearedOnSheet } from '$lib/stats/player-game-stats';
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
		const homeTeam = pickExistingTeam(teams, game.homeTeam.name);

		if (homeTeam) {
			game.homeTeam._status = 'update';
			game.homeTeam.id = homeTeam.id;

			await annotatePlayers(game.homeTeam.playerStats, homeTeam.players);
		}

		const awayTeam = pickExistingTeam(teams, game.awayTeam.name);

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
			const preview = parsers[version].parse(xlsx.read(buffer, { cellDates: true }), { timeZone });

			await annotatePreview(preview, divisionId);

			serverLogger.info('uploaded for preview', { file: spreadsheet.name, admin: admin.id });

			return preview;
		} catch (err) {
			serverLogger.error(err);
			if (err instanceof SpreadsheetParserError) {
				return invalid(...err.issues);
			}

			return invalid(describeFailure(err));
		}
	}
);

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function useReadableTeamName(tx: Transaction, team: Team) {
	const name = readableTeamName(team.name);
	if (name === team.name) return team;
	await tx.update(table.team).set({ name }).where(eq(table.team.id, team.id));
	return { ...team, name };
}

async function saveTeam(tx: Transaction, teamPreview: TeamPreview, divisionId: string) {
	const divisionTeams = await tx.query.team.findMany({ where: { divisionId } });

	if (teamPreview.id && teamPreview._status === 'update') {
		const byId = divisionTeams.find((team) => team.id === teamPreview.id);
		if (byId) return useReadableTeamName(tx, byId);
	}

	const existing = pickExistingTeam(divisionTeams, teamPreview.name);
	if (existing) return useReadableTeamName(tx, existing);

	if (isJerseyNumberTeamName(teamPreview.name)) {
		throw new Error(
			`"${teamPreview.name}" is a jersey number, not a team. Put it under Player No.`
		);
	}

	const name = readableTeamName(teamPreview.name);
	const slug = slugify(name);
	const [created] = await tx.insert(table.team).values({ divisionId, name, slug }).returning();
	return created;
}

async function saveGame(
	tx: Transaction,
	homeTeam: Team,
	awayTeam: Team,
	gamePreview: GamePreview,
	seasonId: string,
	timeZone?: string
) {
	// Same two teams on the same day are one game. A different day is a new game.
	// Games for this division that are not in the sheet are deleted after the sheet is saved.
	const day = calendarDay(gamePreview.completedAt, timeZone);
	const [asStoredHome, asStoredAway] = await Promise.all([
		tx.query.game.findMany({
			where: {
				seasonId,
				homeTeamId: homeTeam.id,
				awayTeamId: awayTeam.id,
			},
		}),
		tx.query.game.findMany({
			where: {
				seasonId,
				homeTeamId: awayTeam.id,
				awayTeamId: homeTeam.id,
			},
		}),
	]);
	const game = [...asStoredHome, ...asStoredAway].find(
		(row) => calendarDay(row.completedAt ?? row.scheduledAt, timeZone) === day
	);

	const pairGames = [...asStoredHome, ...asStoredAway];
	const incomingAt = gamePreview.completedAt?.getTime() ?? 0;
	const laterMeeting = pairGames.some((row) => {
		if (game && row.id === game.id) return false;
		const at = (row.completedAt ?? row.scheduledAt)?.getTime() ?? 0;
		return at > incomingAt;
	});

	if (game) {
		const flipped = game.homeTeamId === awayTeam.id;
		let nextType = resolveImportedGameType(
			game.gameType,
			gamePreview.gameType ?? 'regular',
			gamePreview.gameTypeExplicit
		);
		// Same teams on a later date already have their own game. This date stays regular.
		if (laterMeeting) nextType = 'regular';
		const nextStatsAvailable = gamePreview.statsAvailable ?? true;
		const nextPointsOnly = gamePreview.pointsOnly ?? false;
		const patch: {
			name?: string;
			gameType?: typeof nextType;
			statsAvailable?: boolean;
			pointsOnly?: boolean;
			homeTeamScore?: number;
			awayTeamScore?: number;
			completedAt?: Date;
			defaultLossSide?: 'home' | 'away' | null;
		} = {};

		if (game.gameType !== nextType) patch.gameType = nextType;
		if (game.statsAvailable !== nextStatsAvailable) patch.statsAvailable = nextStatsAvailable;
		if (game.pointsOnly !== nextPointsOnly) patch.pointsOnly = nextPointsOnly;
		const previewDefaultLoss = gamePreview.defaultLossSide ?? null;
		const nextDefaultLoss = flipped
			? previewDefaultLoss === 'home'
				? 'away'
				: previewDefaultLoss === 'away'
					? 'home'
					: null
			: previewDefaultLoss;
		if (game.defaultLossSide !== nextDefaultLoss) patch.defaultLossSide = nextDefaultLoss;
		patch.homeTeamScore = flipped ? gamePreview.awayTeam.score : gamePreview.homeTeam.score;
		patch.awayTeamScore = flipped ? gamePreview.homeTeam.score : gamePreview.awayTeam.score;
		patch.completedAt = gamePreview.completedAt;
		if (!flipped) {
			const nextName = `${readableTeamName(homeTeam.name)} vs ${readableTeamName(awayTeam.name)}`;
			if (game.name !== nextName) patch.name = nextName;
		}

		if (Object.keys(patch).length > 0) {
			await tx.update(table.game).set(patch).where(eq(table.game.id, game.id));
		}
		if (isPostseasonGameType(nextType)) {
			await demoteEarlierMeetings(tx, pairGames, game.id, incomingAt);
		}
		return { id: game.id };
	}

	const createdType = laterMeeting ? 'regular' : (gamePreview.gameType ?? 'regular');
	const [createdGame] = await tx
		.insert(table.game)
		.values({
			seasonId,
			homeTeamId: homeTeam.id,
			awayTeamId: awayTeam.id,
			name: `${readableTeamName(homeTeam.name)} vs ${readableTeamName(awayTeam.name)}`,
			completedAt: gamePreview.completedAt,
			homeTeamScore: gamePreview.homeTeam.score,
			awayTeamScore: gamePreview.awayTeam.score,
			status: 'completed',
			gameType: createdType,
			statsAvailable: gamePreview.statsAvailable ?? true,
			pointsOnly: gamePreview.pointsOnly ?? false,
			defaultLossSide: gamePreview.defaultLossSide ?? null,
		})
		.returning({ id: table.game.id });

	if (createdGame && isPostseasonGameType(createdType)) {
		await demoteEarlierMeetings(tx, pairGames, createdGame.id, incomingAt);
	}

	return createdGame;
}

async function demoteEarlierMeetings(
	tx: Transaction,
	pairGames: Array<{
		id: string;
		gameType: string | null;
		completedAt: Date | null;
		scheduledAt: Date | null;
	}>,
	thisId: string,
	thisAt: number
) {
	for (const row of pairGames) {
		if (row.id === thisId) continue;
		const at = (row.completedAt ?? row.scheduledAt)?.getTime() ?? 0;
		if (at >= thisAt) continue;
		if (!isPostseasonGameType(row.gameType)) continue;
		await tx.update(table.game).set({ gameType: 'regular' }).where(eq(table.game.id, row.id));
	}
}

/** Every pairing in the season: earlier meetings stay regular, the latest keeps its type. */
async function persistRematchGameTypes(tx: Transaction, seasonId: string) {
	const rows = await tx.query.game.findMany({
		where: { seasonId },
		columns: {
			id: true,
			homeTeamId: true,
			awayTeamId: true,
			gameType: true,
			completedAt: true,
			scheduledAt: true,
		},
	});
	const corrected = correctFalsePlayoffTypes(rows);
	for (const next of corrected) {
		const stored = rows.find((row) => row.id === next.id);
		if (!stored || stored.gameType === next.gameType) continue;
		await tx.update(table.game).set({ gameType: next.gameType }).where(eq(table.game.id, next.id));
	}
}

async function saveStats(
	tx: Transaction,
	data: TeamPreview,
	team: Team,
	gameId: string,
	teamPoints: number | null,
	scale: ApplicableScale | null
) {
	for (const playerPreview of data.playerStats) {
		const { jerseyNumber, stats: rawStats, recordedPts } = playerPreview;

		if (!jerseyNumber) {
			throw new Error(`Team: ${team.name} — a player row has no jersey number`);
		}

		const stats = Object.fromEntries(
			rawStatKeys.map((key) => [key, Number(rawStats?.[key]) || 0])
		) as typeof rawStats;
		const line = { ...stats, recordedPts };
		if (!playerAppearedOnSheet(line)) {
			continue;
		}
		const pointsOnly = isPointsOnlyLine(line);

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
		const rated = pointsOnly
			? clearedRating()
			: ratingPatch(stats as CountingLine, teamPoints, scale);

		await tx.insert(table.playerGameStat).values({
			...stats,
			recordedPts: recordedPts ?? null,
			...rated,
			gameId,
			playerId,
		});
	}
}

class StatsheetSaveError extends Error {
	constructor(message: string, options?: { cause?: unknown }) {
		super(message, options);
		this.name = 'StatsheetSaveError';
	}
}

function findSaveError(err: unknown): StatsheetSaveError | undefined {
	if (err instanceof StatsheetSaveError) return err;
	if (err instanceof Error && err.cause) return findSaveError(err.cause);
	return undefined;
}

function describeFailure(err: unknown): string {
	if (isHttpError(err)) {
		return err.body.message?.trim() || `Request failed (${err.status})`;
	}

	if (err instanceof Error) {
		const own = err.message.trim();
		const cause = err.cause ? describeFailure(err.cause) : '';
		if (cause && (own.startsWith('Failed query') || !own)) {
			return cause;
		}
		if (cause && !own.includes(cause)) {
			return `${own} — ${cause}`;
		}
		return own || cause || 'Unknown error';
	}

	return 'Unknown error';
}

function formatGameDate(value: unknown, timeZone?: string): string | null {
	const date =
		value instanceof Date
			? value
			: typeof value === 'string' || typeof value === 'number'
				? new Date(value)
				: null;
	if (!date || Number.isNaN(date.getTime())) return null;

	const options: Intl.DateTimeFormatOptions = {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
	};
	if (timeZone) {
		try {
			return new Intl.DateTimeFormat('en-US', { ...options, timeZone }).format(date);
		} catch {
			return new Intl.DateTimeFormat('en-US', options).format(date);
		}
	}
	return new Intl.DateTimeFormat('en-US', options).format(date);
}

function gameHeading(
	game: { name: string; playedOn?: string | null; completedAt?: unknown },
	timeZone?: string
) {
	const fromSheet = typeof game.playedOn === 'string' ? game.playedOn.trim() : null;
	const date = fromSheet
		? fromSheet
		: game.playedOn === ''
			? null
			: formatGameDate(game.completedAt, timeZone);
	return date ? `Game: ${game.name} — ${date}` : `Game: ${game.name}`;
}

function formatSaveValidationIssues(
	games: GamePreview[],
	issues: { path: PropertyKey[]; message: string }[],
	timeZone?: string
) {
	return issues
		.map((issue) => {
			const path = issue.path.map(String);
			const gameIndex = path[0] === 'games' ? Number(path[1]) : NaN;
			const game = Number.isInteger(gameIndex) ? games[gameIndex] : undefined;

			const parts: string[] = [];
			if (game) {
				parts.push(gameHeading(game, timeZone));
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
		timeZone: z.string().optional(),
	}),
	async ({ games, divisionId, timeZone }) => {
		const admin = await requireAdmin();

		const parsed = savePreviewSchema.safeParse({ games, divisionId });
		if (!parsed.success) {
			const details = formatSaveValidationIssues(
				games as GamePreview[],
				parsed.error.issues.map((issue) => ({ path: issue.path, message: issue.message })),
				timeZone
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
			const season = division.season;
			if (!season) {
				notFound({ resource: 'season' });
			}

			const ratingScale = await loadApplicableScale(season.organizationId, division.slug);

			await db.transaction(async (tx) => {
				const keptGameIds = new Set<string>();
				for (const game of parsed.data.games) {
					try {
						const homeTeam = await saveTeam(tx, game.homeTeam, divisionId);
						const awayTeam = await saveTeam(tx, game.awayTeam, divisionId);

						if (!homeTeam || !awayTeam) {
							const missing = [
								!homeTeam ? `home (${game.homeTeam.name})` : null,
								!awayTeam ? `away (${game.awayTeam.name})` : null,
							].filter((name) => name != null);
							throw new Error(`Could not find or create ${missing.join(' and ')}`);
						}

						const { id: gameId } = await saveGame(
							tx,
							homeTeam,
							awayTeam,
							game,
							season.id,
							timeZone
						);
						keptGameIds.add(gameId);

						await tx.delete(table.playerGameStat).where(eq(table.playerGameStat.gameId, gameId));

						if (game.statsAvailable !== false) {
							await saveStats(
								tx,
								game.homeTeam,
								homeTeam,
								gameId,
								game.homeTeam.score ?? null,
								ratingScale
							);
							await saveStats(
								tx,
								game.awayTeam,
								awayTeam,
								gameId,
								game.awayTeam.score ?? null,
								ratingScale
							);
						}
					} catch (err) {
						const reason = describeFailure(err);
						const heading = gameHeading(game, timeZone);
						const line = reason.startsWith('Game:') ? reason : `${heading} — ${reason}`;
						throw new StatsheetSaveError(line, { cause: err });
					}
				}

				const divisionTeams = await tx.query.team.findMany({
					where: { divisionId },
					columns: { id: true },
				});
				const seasonGames = await tx.query.game.findMany({
					where: { seasonId: season.id },
					columns: { id: true, homeTeamId: true, awayTeamId: true },
				});
				const staleIds = staleDivisionGameIds(
					seasonGames,
					new Set(divisionTeams.map((team) => team.id)),
					keptGameIds
				);
				if (staleIds.length > 0) {
					await tx.delete(table.game).where(inArray(table.game.id, staleIds));
				}

				await persistRematchGameTypes(tx, season.id);

				const leftoverTeams = await tx.query.team.findMany({
					where: { divisionId },
					columns: { id: true, name: true },
				});
				const jerseyTeamIds = leftoverTeams
					.filter((team) => isJerseyNumberTeamName(team.name))
					.map((team) => team.id);
				if (jerseyTeamIds.length > 0) {
					await tx.delete(table.team).where(inArray(table.team.id, jerseyTeamIds));
				}
			});

			const ratings = await recalibrateOrganizationRatings(season.organizationId);
			serverLogger.info('saved stats', {
				admin: admin.id,
				rated: ratings.rated,
				cleared: ratings.cleared,
			});
			await publishScheduleChange(season.id);
		} catch (err) {
			serverLogger.error(err);
			const saveError = findSaveError(err);
			if (saveError) error(400, saveError.message);
			if (isHttpError(err)) throw err;
			error(400, describeFailure(err));
		}
	}
);
