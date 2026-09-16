import { z } from 'zod';
import { idField } from './common';

/** Checkbox fields must be optional — unchecked boxes omit the value. */
export const leagueVisibilitySchema = z.object({
	organizationId: idField,
	isListed: z.boolean().optional().default(false),
	publishStandings: z.boolean().optional().default(false),
	publishGameScores: z.boolean().optional().default(false),
	publishTeamStats: z.boolean().optional().default(false),
	publishPlayerStats: z.boolean().optional().default(false),
	showPlayerFullNames: z.boolean().optional().default(false),
	showPlayerPhotos: z.boolean().optional().default(false),
	showBirthdate: z.boolean().optional().default(false),
	publishDevelopmentReports: z.boolean().optional().default(false),
});

export type LeagueVisibilityInput = z.infer<typeof leagueVisibilitySchema>;

export type LeagueVisibilityFlags = {
	isListed: boolean;
	publishStandings: boolean;
	publishGameScores: boolean;
	publishTeamStats: boolean;
	publishPlayerStats: boolean;
	showPlayerFullNames: boolean;
	showPlayerPhotos: boolean;
	showBirthdate: boolean;
	publishDevelopmentReports: boolean;
};

export const DEFAULT_LEAGUE_VISIBILITY: LeagueVisibilityFlags = {
	isListed: true,
	publishStandings: true,
	publishGameScores: true,
	publishTeamStats: true,
	publishPlayerStats: true,
	showPlayerFullNames: true,
	showPlayerPhotos: false,
	showBirthdate: false,
	publishDevelopmentReports: false,
};
