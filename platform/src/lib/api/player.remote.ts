import { form, query } from '$app/server';
import type { CrudAction, ResourceTarget } from '$lib/forms/types';
import { idField, idOnlySchema } from '$lib/schemas/common';
import {
	coachNoteSchema,
	createPlayerSchema,
	playerSchema,
	renamePlayerSchema,
	updatePlayerSchema,
} from '$lib/schemas/player';
import { db } from '$lib/server/db';
import { PLAYER_UNIQUE_JERSEY_PER_TEAM_CONSTRAINT } from '$lib/server/db/schema';
import { forbidden, internal, internalNoId, notFound } from '$lib/server/fail';
import { serverLogger } from '$lib/server/logger';
import { invalid } from '@sveltejs/kit';
import * as table from '$lib/server/db/schema';
import { isConstraintError } from './errors.server';
import { eq } from 'drizzle-orm';
import { isUserAdmin, requireAdmin, requireUser } from './auth.remote';
import { getCoach } from './coach.remote';
import { isUserLeagueOrganizer } from './league.remote';
import { requireFamilyPlayerAccess } from '$lib/server/family-access.server';
import {
	isPlayerIdentityChange,
	publishSavedPlayer,
	relayDashboard,
} from '$lib/server/dashboard-sync.server';
import { z } from 'zod';

export const getPlayer = query.live(
	z.union([
		idOnlySchema,
		z.object({
			teamId: idField,
			jerseyNumber: playerSchema.jerseyNumber,
		}),
	]),
	(filters) =>
		relayDashboard(
			async () => {
				const player = await db.query.player.findFirst({ where: filters });

				if (!player) {
					notFound(
						{ resource: 'player' },
						{ message: `player not found ${JSON.stringify(filters)}` }
					);
				}

				return player;
			},
			(player, change) => isPlayerIdentityChange(change, { playerId: player.id })
		)
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

	// Foundation: league coaches are view-only; solo (team org) coaches keep roster writes.
	const teamRow = await db.query.team.findFirst({
		where: { id: coach.teamId },
		with: {
			division: {
				with: {
					season: {
						with: { organization: true },
					},
				},
			},
		},
	});

	if (teamRow?.division?.season?.organization?.type === 'league') {
		forbidden({ resource: 'player' }, { message: 'Coach portal is read-only for now.' });
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

		await publishSavedPlayer(created.id, data.teamId, 'player');

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

/**
 * Admins only, and the name is the only column it writes. Coaches and organizers rename
 * through `updatePlayer` on their own roster pages instead.
 */
export const renamePlayer = form(renamePlayerSchema, async ({ id, name }) => {
	await requireAdmin();
	await getPlayer({ id });

	const [renamed] = await db
		.update(table.player)
		.set({ name })
		.where(eq(table.player.id, id))
		.returning({ teamId: table.player.teamId, name: table.player.name });

	const user = await requireUser();
	serverLogger.info('renamed player', { id, userId: user.id, name: renamed?.name });

	await publishSavedPlayer(id, renamed?.teamId, 'player');

	return { success: true };
});

export const updatePlayer = form(updatePlayerSchema, async (data, issue) => {
	const { id, ...changes } = data;

	await assertPlayerPermissions('update', { resource: 'player', id });

	// Renaming is admin-only wherever it happens; coaches and organizers keep the jersey number.
	const existing = await getPlayer({ id });
	if (changes.name !== existing.name && !(await isUserAdmin())) {
		return invalid(issue.name('Only an admin can change a player name.'));
	}

	try {
		const [updated] = await db
			.update(table.player)
			.set(changes)
			.where(eq(table.player.id, id))
			.returning({ teamId: table.player.teamId, name: table.player.name });

		const user = await requireUser();
		serverLogger.info('updated player', { id, userId: user.id, name: updated?.name });

		await publishSavedPlayer(id, updated?.teamId, 'player');

		return { success: true };
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

	await publishSavedPlayer(id, deleted?.teamId, 'player');
});

async function requireOrganizerOrAdmin() {
	if ((await isUserAdmin()) || (await isUserLeagueOrganizer())) return;
	forbidden({ resource: 'player' });
}

export const getCoachNote = query.live(z.object({ playerId: idField }), ({ playerId }) =>
	relayDashboard(
		async () => {
			await requireFamilyPlayerAccess(playerId);

			const [row] = await db
				.select({ body: table.playerCoachNote.body })
				.from(table.playerCoachNote)
				.where(eq(table.playerCoachNote.playerId, playerId))
				.limit(1);

			return { body: row?.body ?? null };
		},
		(_note, change) => change.kind === 'note' && change.playerId === playerId
	)
);

export const saveCoachNote = form(coachNoteSchema, async ({ playerId, body }) => {
	await requireOrganizerOrAdmin();
	const player = await getPlayer({ id: playerId });

	const trimmed = body.trim();

	if (!trimmed) {
		await db.delete(table.playerCoachNote).where(eq(table.playerCoachNote.playerId, playerId));
	} else {
		await db
			.insert(table.playerCoachNote)
			.values({ playerId, body: trimmed, updatedAt: new Date() })
			.onConflictDoUpdate({
				target: table.playerCoachNote.playerId,
				set: { body: trimmed, updatedAt: new Date() },
			});
	}

	const user = await requireUser();
	serverLogger.info('saved coach note', { playerId, userId: user.id, cleared: !trimmed });

	await publishSavedPlayer(playerId, player.teamId, 'note');

	return { success: true };
});
