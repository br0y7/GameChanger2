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
import { requireUser } from './auth.remote';
import { getCoach } from './coach.remote';
import { z } from 'zod';

export const getPlayer = query(
	z.object({
		id: idField.optional(),
		teamId: idField.optional(),
		jerseyNumber: playerSchema.jerseyNumber,
	}),
	async (filters) => {
		const player = await db.query.player.findFirst({ where: filters });

		if (!player) {
			notFound({ resource: 'player' }, { message: `player not found ${JSON.stringify(filters)}` });
		}

		return player;
	}
);

async function assertCoachPermissions(action: CrudAction, target: ResourceTarget): Promise<void> {
	const user = await requireUser();

	const coach = await getCoach({ userId: user.id });

	if (!coach) {
		forbidden({ resource: 'user' });
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
	await assertCoachPermissions('create', { resource: 'player' });

	try {
		const [created] = await db.insert(table.player).values(data).returning({ id: table.player.id });

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

	await assertCoachPermissions('update', { resource: 'player', id });

	try {
		await db.update(table.player).set(data).where(eq(table.player.id, id));
	} catch (err) {
		if (isConstraintError(err, PLAYER_UNIQUE_JERSEY_PER_TEAM_CONSTRAINT)) {
			return invalid(issue.jerseyNumber('Jersey number already taken.'));
		}

		serverLogger.error(err);
		return invalid('Something went wrong');
	}
});

export const deletePlayer = form(idOnlySchema, async ({ id }) => {
	await assertCoachPermissions('delete', { resource: 'player', id });

	await db.delete(table.player).where(eq(table.player.id, id));

	serverLogger.info(`deleted player: ${id}`);
});
