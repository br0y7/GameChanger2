import { z } from 'zod';
import { spreadsheetParserVersions as versions } from '../parsers/base';
import { idField, requiredName } from './common';
import { playerSchema } from './player';
import { Temporal } from 'temporal-polyfill';

const TIME_ZONE_ERROR = 'Time Zone is invalid. Follow IANA time zone format: America/Winnipeg';

export const uploadSpreadsheetSchema = z.object({
	version: z.enum(versions),
	divisionId: idField,
	timeZone: z.string(TIME_ZONE_ERROR).refine((tz) => {
		try {
			Temporal.Now.zonedDateTimeISO().withTimeZone(tz);
			return true;
		} catch {
			return false;
		}
	}, TIME_ZONE_ERROR),
	/**
	 * Apparently, Bun's types are broken, so can't use instanceof File.
	 * Therefore can't use z.file() from zod, this is a
	 * workaround until the fixes get merged.
	 * ref: https://github.com/oven-sh/bun/pull/30328
	 */
	spreadsheet: z.custom<File>((data) => {
		return (
			(data as File)?.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
		);
	}, 'A valid spreadsheet file is required'),
	// The code below should've been the implementation.
	// z.file('File is required')
	// .mime(
	// 	'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
	// 	'Only supports xlsx for now'
	// ),
});

export const statKeys = [
	'fgm',
	'fga',
	'fg3m',
	'fg3a',
	'ftm',
	'fta',
	'oreb',
	'dreb',
	'ast',
	'stl',
	'blk',
	'tov',
	'pf',
];

const statKeysSchema = z.enum(statKeys);

export type StatKey = z.infer<typeof statKeysSchema>;

const importStatusSchema = z.enum(['new', 'update']);

export type ImportStatus = z.infer<typeof importStatusSchema>;

export const playerGameStatPreviewSchema = z.object({
	playerId: idField.optional(),
	jerseyNumber: playerSchema.jerseyNumber,
	_status: importStatusSchema.default('new'),

	stats: z.record(statKeysSchema, z.number()),
});

export type PlayerGameStatsPreview = z.infer<typeof playerGameStatPreviewSchema>;

export const teamPreviewSchema = z.object({
	id: idField.optional(),
	...requiredName('Team Name'),
	score: z.number().default(0),
	playerStats: z.array(playerGameStatPreviewSchema),
	_status: importStatusSchema.default('new'),
});

export type TeamPreview = z.infer<typeof teamPreviewSchema>;

export const gamePreviewSchema = z.object({
	...requiredName('Game Name'),
	completedAt: z.date(),
	homeTeam: teamPreviewSchema,
	awayTeam: teamPreviewSchema,
});

export type GamePreview = z.infer<typeof gamePreviewSchema>;

export const spreadsheetPreviewSchema = z.object({
	version: z.enum(versions),
	games: z.array(gamePreviewSchema),
});

export type SpreadsheetPreview = z.infer<typeof spreadsheetPreviewSchema>;

export const savePreviewSchema = z.object({
	games: z.array(gamePreviewSchema),
	divisionId: idField,
});
