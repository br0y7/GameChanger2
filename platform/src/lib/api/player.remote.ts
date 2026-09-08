import { form, query } from '$app/server';
import type { CrudAction, ResourceTarget } from '$lib/forms/types';
import { idField, idOnlySchema } from '$lib/schemas/common';
import { createPlayerSchema, playerSchema, updatePlayerSchema } from '$lib/schemas/player';
import { db } from '$lib/server/db';
import { PLAYER_UNIQUE_JERSEY_PER_TEAM_CONSTRAINT } from '$lib/server/db/schema';
import { forbidden, internal, internalNoId, notFound } from '$lib/server/fail';
import { serverLogger } from '$lib/server/logger';
import { invalid } from '@sveltejs/kit';
import * as table from '$lib/server/db/schema';
import { isConstraintError } from './errors.server';
import { eq } from 'drizzle-orm';
import { isUserAdmin, requireUser } from './auth.remote';
import { getCoach } from './coach.remote';
import { isUserLeagueOrganizer } from './league.remote';
import { getTeam } from './team.remote';
import { z } from 'zod';

export const getPlayer = query(
	z.union([
		idOnlySchema,
		z.object({
			teamId: idField,
			jerseyNumber: playerSchema.jerseyNumber,
		}),
	]),
	async (filters) => {
		const player = await db.query.player.findFirst({ where: filters });

		if (!player) {
			notFound({ resource: 'player' }, { message: `player not found ${JSON.stringify(filters)}` });
		}

		return player;
	}
);

async function assertPlayerPermissions(action: CrudAction, target: ResourceTarget): Promise<void> {
	const user = await requireUser();

	if ((await isUserAdmin()) || (await isUserLeagueOrganizer())) {
		if (action === 'create') return;

		if (!target.id) {
			internalNoId(target, { action });
		}

		await getPlayer({ id: target.id });
		return;
	}

	const coach = await getCoach({ userId: user.id });

	if (!coach) {
		forbidden({ resource: 'player' });
	}

	const modifyingActions: CrudAction[] = ['update', 'delete'];

	if (!modifyingActions.includes(action)) {
		return;
	}

	if (!target.id) {
		internalNoId(target, { action });
	}

	const player = await getPlayer({ id: target.id });

	if (!player) {
		notFound(target);
	}

	if (player.teamId !== coach.teamId) {
		internal(target, {
			action,
			message: `Somehow different team id for player: ${player.id} coach: ${coach.id}`,
		});
	}
}

export const createPlayer = form(createPlayerSchema, async (data, issue) => {
	await assertPlayerPermissions('create', { resource: 'player' });

	try {
		const [created] = await db.insert(table.player).values(data).returning({ id: table.player.id });

		const user = await requireUser();
		serverLogger.info('created player', { id: created.id, userId: user.id });

		void getTeam({ id: data.teamId, include: { players: true } }).refresh();

		return {
			data: {
				id: created.id,
			},
		};
	} catch (err) {
		if (isConstraintError(err, PLAYER_UNIQUE_JERSEY_PER_TEAM_CONSTRAINT)) {
			return invalid(issue.jerseyNumber('Jersey number already taken.'));
		}

		serverLogger.error(err);

		return invalid('Something went wrong.');
	}
});

export const updatePlayer = form(updatePlayerSchema, async (data, issue) => {
	const { id } = data;

	await assertPlayerPermissions('update', { resource: 'player', id });

	try {
		const [updated] = await db
			.update(table.player)
			.set(data)
			.where(eq(table.player.id, id))
			.returning({ teamId: table.player.teamId });

		const user = await requireUser();
		serverLogger.info('updated player', { id, userId: user.id });

		if (updated?.teamId) {
			void getTeam({ id: updated.teamId, include: { players: true } }).refresh();
		}
	} catch (err) {
		if (isConstraintError(err, PLAYER_UNIQUE_JERSEY_PER_TEAM_CONSTRAINT)) {
			return invalid(issue.jerseyNumber('Jersey number already taken.'));
		}

		serverLogger.error(err);
		return invalid('Something went wrong');
	}
});

export const deletePlayer = form(idOnlySchema, async ({ id }) => {
	await assertPlayerPermissions('delete', { resource: 'player', id });

	const [deleted] = await db
		.delete(table.player)
		.where(eq(table.player.id, id))
		.returning({ teamId: table.player.teamId });

	const user = await requireUser();
	serverLogger.info('deleted player', { id, userId: user.id });

	if (deleted?.teamId) {
		void getTeam({ id: deleted.teamId, include: { players: true } }).refresh();
	}
});
