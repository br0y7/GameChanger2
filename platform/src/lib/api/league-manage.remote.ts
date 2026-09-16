import { query } from '$app/server';
import { idField } from '$lib/schemas/common';
import { db } from '$lib/server/db';
import { z } from 'zod';

export const getSeasonTeams = query(z.object({ seasonId: idField }), async ({ seasonId }) => {
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
		division.teams.map((team) => ({
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

export const getSeasonPlayers = query(z.object({ seasonId: idField }), async ({ seasonId }) => {
	const divisions = await db.query.division.findMany({
		where: { seasonId },
		with: {
			teams: {
				with: {
					players: true,
				},
			},
		},
	});

	const players = divisions.flatMap((division) =>
		division.teams.flatMap((team) =>
			team.players.map((player) => ({
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
			}))
		)
	);

	return players.sort((a, b) => a.name.localeCompare(b.name));
});

export const getSeasonGames = query(z.object({ seasonId: idField }), async ({ seasonId }) => {
	const games = await db.query.game.findMany({
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

	return games.flatMap((game) => {
		if (!game.homeTeam || !game.awayTeam) return [];
		return [
			{
				id: game.id,
				name: game.name,
				status: game.status,
				gameType: game.gameType,
				statsAvailable: game.statsAvailable,
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
});
