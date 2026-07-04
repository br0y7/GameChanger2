import { form, getRequestEvent } from '$app/server';
import type { CrudAction, ResourceTarget } from '$lib/forms/types';
import { idOnlySchema } from '$lib/schemas/common';
import { createPlayerSchema, updatePlayerSchema } from '$lib/schemas/player';
import { db } from '$lib/server/db';
import { PLAYER_UNIQUE_JERSEY_PER_TEAM_CONSTRAINT } from '$lib/server/db/schema';
import { forbidden, internal, notFound, unauthorized } from '$lib/server/fail';
import { serverLogger } from '$lib/server/logger';
import { invalid } from '@sveltejs/kit';
import * as table from '$lib/server/db/schema';
import { isConstraintError } from './errors.server';
import { eq } from 'drizzle-orm';

async function assertCoachPermissions(
	action: CrudAction,
	target: ResourceTarget,
	locals: App.Locals
): Promise<void> {
	const { user } = locals;

	if (!user) {
		unauthorized({ resource: 'user' });
	}

	const coach = await db.query.coach.findFirst({
		where: {
			userId: user.id,
		},
		columns: { id: true, teamId: true },
	});

	if (!coach) {
		forbidden({ resource: 'user' });
	}

	const modifyingActions: CrudAction[] = ['update', 'delete'];

	if (!modifyingActions.includes(action)) {
		return;
	}

	if (!target.id) {
		internal(
			{ resource: 'player' },
			{
				action,
				message:
					"This shouldn't happen, pass the player id in target.id when updating or deleting.",
			}
		);
	}

	const player = await db.query.player.findFirst({
		where: {
			id: target.id,
		},
		columns: { id: true, teamId: true },
	});

	if (!player) {
		notFound(target);
	}

	if (player.teamId !== coach.teamId) {
		internal(
			{ resource: 'player', id: target.id },
			{
				action,
				message: `Somehow different team id for player: ${player.id} coach: ${coach.id}`,
			}
		);
	}
}

export const addPlayer = form(createPlayerSchema, async (data, issue) => {
	const { locals } = getRequestEvent();

	if (!locals.onboarding) {
		// this shouldn't run, for defensive and type-safety only
		return internal({ resource: 'player' });
	}

	await assertCoachPermissions('create', { resource: 'player' }, locals);

	try {
		const [created] = await db
			.insert(table.player)
			.values({
				...data,
			})
			.returning({ id: table.player.id });

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
	const { locals } = getRequestEvent();
	const { id } = data;

	await assertCoachPermissions('update', { resource: 'player', id }, locals);

	try {
		await db
			.update(table.player)
			.set({ ...data })
			.where(eq(table.player.id, id));
	} catch (err) {
		if (isConstraintError(err, PLAYER_UNIQUE_JERSEY_PER_TEAM_CONSTRAINT)) {
			return invalid(issue.jerseyNumber('Jersey number already taken.'));
		}

		serverLogger.error(err);
		return invalid('Something went wrong');
	}
});

export const deletePlayer = form(idOnlySchema, async ({ id }) => {
	const { locals } = getRequestEvent();

	await assertCoachPermissions('delete', { resource: 'player', id }, locals);

	await db.delete(table.player).where(eq(table.player.id, id));

	serverLogger.info(`deleted player: ${id}`);
});
