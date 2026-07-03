import { form, getRequestEvent } from '$app/server';
import type { CrudAction, ResourceTarget } from '$lib/forms/types';
import { idOnlySchema } from '$lib/schemas/common';
import { db } from '$lib/server/db';
import { player, PLAYER_UNIQUE_JERSEY_PER_TEAM_CONSTRAINT } from '$lib/server/db/schema';
import { forbidden, internal, notFound, unauthorized } from '$lib/server/fail';
import { serverLogger } from '$lib/server/logger';
import { invalid } from '@sveltejs/kit';
import { SQL } from 'bun';
import { DrizzleQueryError, eq } from 'drizzle-orm';
import z from 'zod';

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

	const targetPlayer = await db.query.player.findFirst({
		where: {
			id: target.id,
		},
		columns: { id: true, teamId: true },
	});

	if (!targetPlayer) {
		notFound(target);
	}

	if (targetPlayer.teamId !== coach.teamId) {
		internal(
			{ resource: 'player', id: target.id },
			{
				action,
				message: `Somehow different team id for player: ${targetPlayer.id} coach: ${coach.id}`,
			}
		);
	}
}

function isDuplicateJerseyNumber(err: unknown) {
	return (
		err instanceof DrizzleQueryError &&
		err.cause instanceof SQL.PostgresError &&
		err.cause.constraint === PLAYER_UNIQUE_JERSEY_PER_TEAM_CONSTRAINT
	);
}

const playerSchema = {
	name: z
		.string()
		.trim()
		.min(1, 'Player name is required')
		.max(50, 'Player name must be less than 50 characters.'),
	jerseyNumber: z
		.string()
		.trim()
		.regex(/^[0-9]{0,2}$/, 'Jersey number must be 1 or 2 digits (0 to 99)')
		.transform((value) => (value === '' ? undefined : value))
		.optional(),
};

const createPlayerSchema = z.object({
	...playerSchema,
	teamId: z.uuid('Please select a team.'),
});

export type CreatePlayerInput = z.infer<typeof createPlayerSchema>;

export const addPlayer = form(createPlayerSchema, async (data, issue) => {
	const { locals } = getRequestEvent();

	if (!locals.onboarding) {
		// this shouldn't run, for defensive and type-safety only
		return internal({ resource: 'player' });
	}

	await assertCoachPermissions('create', { resource: 'player' }, locals);

	try {
		const [created] = await db
			.insert(player)
			.values({
				...data,
			})
			.returning({ id: player.id });

		return {
			data: {
				id: created.id,
			},
		};
	} catch (err) {
		if (isDuplicateJerseyNumber(err)) {
			return invalid(issue.jerseyNumber('Jersey number already taken.'));
		}

		serverLogger.error(err);

		return invalid('Something went wrong.');
	}
});

const updatePlayerSchema = z.object({
	...playerSchema,
	id: z.uuid().nonoptional('Player ID is required.'),
});

export type UpdatePlayerInput = z.infer<typeof updatePlayerSchema>;

export const updatePlayer = form(updatePlayerSchema, async (data, issue) => {
	const { locals } = getRequestEvent();
	const { id } = data;

	await assertCoachPermissions('update', { resource: 'player', id }, locals);

	try {
		await db
			.update(player)
			.set({ ...data })
			.where(eq(player.id, id));
	} catch (err) {
		if (isDuplicateJerseyNumber(err)) {
			return invalid(issue.jerseyNumber('Jersey number already taken.'));
		}

		serverLogger.error(err);
		return invalid('Something went wrong');
	}
});

export const deletePlayer = form(idOnlySchema, async ({ id }) => {
	const { locals } = getRequestEvent();

	await assertCoachPermissions('delete', { resource: 'player', id }, locals);

	await db.delete(player).where(eq(player.id, id));

	serverLogger.info(`deleted player: ${id}`);
});
