import { query } from '$app/server';
import {
	isPlayerIdentityChange,
	isScheduleChange,
	relayDashboard,
} from '$lib/server/dashboard-sync.server';
import { idField } from '$lib/schemas/common';
import { db } from '$lib/server/db';
import { correctFalsePlayoffTypes, dedupeMatchups } from '$lib/stats/matchup';
import { z } from 'zod';
import { purgeJerseyNumberTeamsForSeason } from '$lib/import/jersey-number-teams.server';
import { mergeDuplicateTeamsForSeason } from '$lib/import/duplicate-teams.server';
import { isJerseyNumberTeamName } from '$lib/import/team-match';

export const getSeasonTeams = query(z.object({ seasonId: idField }), async ({ seasonId }) => {
	await purgeJerseyNumberTeamsForSeason(seasonId);
	await mergeDuplicateTeamsForSeason(seasonId);

	const divisions = await db.query.division.findMany({
		where: { seasonId },
		with: {
			teams: {
				with: {
					players: { columns: { id: true } },
				},
				orderBy: { name: 'asc' },
			},
		},
		orderBy: { name: 'asc' },
	});

	return divisions.flatMap((division) =>
		division.teams
			.filter((team) => !isJerseyNumberTeamName(team.name))
			.map((team) => ({
				id: team.id,
				name: team.name,
				slug: team.slug,
				divisionId: division.id,
				divisionName: division.name,
				divisionSlug: division.slug,
				playerCount: team.players.length,
			}))
	);
});

/** Read-only picker for admin/demo family lists. Skips merge/purge and live updates. */
export const listSeasonPlayerPicker = query(z.object({ seasonId: idField }), async ({ seasonId }) => {
	const divisions = await db.query.division.findMany({
		where: { seasonId },
		columns: { id: true, name: true, slug: true },
		with: {
			teams: {
				columns: { id: true, name: true, slug: true },
				with: {
					players: { columns: { id: true, name: true, jerseyNumber: true } },
				},
				orderBy: { name: 'asc' },
			},
		},
		orderBy: { name: 'asc' },
	});

	const scoped = divisions.map((division) => ({
		...division,
		teams: division.teams.filter((team) => !isJerseyNumberTeamName(team.name)),
	}));

	return {
		divisions: scoped.map((division) => ({
			id: division.id,
			name: division.name,
			slug: division.slug,
		})),
		teams: scoped.flatMap((division) =>
			division.teams.map((team) => ({
				id: team.id,
				name: team.name,
				slug: team.slug,
				divisionId: division.id,
				divisionName: division.name,
				playerCount: team.players.length,
			}))
		),
		players: scoped
			.flatMap((division) =>
				division.teams.flatMap((team) =>
					team.players.map((player) => ({
						id: player.id,
						name: player.name,
						jerseyNumber: player.jerseyNumber,
						teamId: team.id,
						teamName: team.name,
						divisionId: division.id,
						divisionName: division.name,
					}))
				)
			)
			.sort((a, b) => a.name.localeCompare(b.name)),
	};
});

export const getSeasonPlayers = query.live(z.object({ seasonId: idField }), ({ seasonId }) =>
	relayDashboard(
		async () => {
			await purgeJerseyNumberTeamsForSeason(seasonId);
			await mergeDuplicateTeamsForSeason(seasonId);

			const divisions = await db.query.division.findMany({
				where: { seasonId },
				with: {
					teams: {
						with: {
							players: {
								with: {
									followers: { columns: { status: true } },
								},
							},
						},
					},
				},
			});

			const players = divisions.flatMap((division) =>
				division.teams
					.filter((team) => !isJerseyNumberTeamName(team.name))
					.flatMap((team) =>
						team.players.map((player) => {
							const hasAccount =
								!!player.userId ||
								player.followers.some((follower) => follower.status === 'active');
							const accountStatus = hasAccount
								? ('account' as const)
								: player.followers.some((follower) => follower.status === 'invited')
									? ('invited' as const)
									: ('none' as const);

							return {
								id: player.id,
								name: player.name,
								jerseyNumber: player.jerseyNumber,
								teamId: team.id,
								teamName: team.name,
								teamSlug: team.slug,
								divisionId: division.id,
								divisionName: division.name,
								divisionSlug: division.slug,
								updatedAt: player.updatedAt,
								accountStatus,
							};
						})
					)
			);

			return players.sort((a, b) => a.name.localeCompare(b.name));
		},
		(_players, change) => isPlayerIdentityChange(change, { seasonId })
	)
);

export const getSeasonGames = query.live(z.object({ seasonId: idField }), ({ seasonId }) =>
	relayDashboard(
		async () => {
			const rawGames = await db.query.game.findMany({
				where: { seasonId },
				with: {
					homeTeam: {
						columns: { id: true, name: true, slug: true, divisionId: true },
						with: { division: { columns: { slug: true, name: true } } },
					},
					awayTeam: {
						columns: { id: true, name: true, slug: true, divisionId: true },
						with: { division: { columns: { slug: true, name: true } } },
					},
				},
				orderBy: { completedAt: 'desc' },
			});
			const games = dedupeMatchups(correctFalsePlayoffTypes(rawGames));

			return games.flatMap((game) => {
				if (!game.homeTeam || !game.awayTeam) return [];
				const base = `${game.homeTeam.name} vs ${game.awayTeam.name}`;
				const suffix = game.name.match(/\s*\([^)]*\)\s*$/)?.[0] ?? '';
				return [
					{
						id: game.id,
						name: suffix ? `${base}${suffix.startsWith(' ') ? suffix : ` ${suffix}`}` : base,
						status: game.status,
						gameType: game.gameType,
						statsAvailable: game.statsAvailable,
						pointsOnly: game.pointsOnly,
						defaultLossSide: game.defaultLossSide,
						homeTeamScore: game.homeTeamScore ?? 0,
						awayTeamScore: game.awayTeamScore ?? 0,
						completedAt: game.completedAt,
						scheduledAt: game.scheduledAt,
						homeTeam: {
							id: game.homeTeam.id,
							name: game.homeTeam.name,
							slug: game.homeTeam.slug,
							divisionSlug: game.homeTeam.division?.slug ?? '',
						},
						awayTeam: {
							id: game.awayTeam.id,
							name: game.awayTeam.name,
							slug: game.awayTeam.slug,
							divisionSlug: game.awayTeam.division?.slug ?? '',
						},
					},
				];
			});
		},
		(_games, change) =>
			isScheduleChange(change, { seasonId }) || isPlayerIdentityChange(change, { seasonId })
	)
);
