import { auth } from '$lib/server/auth.js';
import { db } from '$lib/server/db/index.js';
import { serverLogger } from '$lib/server/logger.js';
import { isActionFailure, redirect, type ActionFailure } from '@sveltejs/kit';
import { DrizzleQueryError, eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types.js';
import { resolve } from '$app/paths';
import {
	coach,
	organization,
	player,
	PLAYER_UNIQUE_JERSEY_PER_TEAM_CONSTRAINT,
	season,
	team,
} from '$lib/server/db/schema';
import { NEXT_COACH_ONBOARDING_STEP, type CoachOnboardingStep } from '$lib/onboarding/steps.js';
import { isValidOnboarding } from '$lib/server/guards.js';
import { createTeamOrgSchema } from '$lib/schemas/team';
import {
	forbidden,
	internal,
	parseError,
	unauthorized,
	validationError,
	type ValidationErrorOptions,
} from '$lib/server/fail.js';
import {
	createPlayerSchema,
	updatePlayerSchema,
	type PlayerFormSchema,
} from '$lib/schemas/player.js';
import { SQL } from 'bun';
import { idOnlySchema } from '$lib/schemas/common.js';
import { advanceOnboardingStep, handleOrgAPIError } from '$lib/server/onboarding';
import type { CrudAction, ErrorMessageState, ResourceTarget } from '$lib/forms/types.js';

export const load: PageServerLoad = async ({ locals }) => {
	const { onboarding } = locals;

	if (!isValidOnboarding('coach', onboarding)) {
		redirect(303, resolve('/onboarding'));
	}

	const currentStep = onboarding.currentStep as CoachOnboardingStep;

	if (currentStep === 'add-players') {
		const coach = await db.query.coach.findFirst({
			where: {
				userId: onboarding.userId,
			},
			columns: {
				id: true,
				teamId: true,
			},
		});

		if (!coach) {
			throw new Error('Unreachable: Coach not found');
		}

		const team = await db.query.team.findFirst({
			where: {
				id: coach.teamId,
			},
			with: {
				players: true,
			},
		});

		if (!team) {
			throw new Error('Unreachable: Team not found');
		}

		return { team };
	}
};

async function verifyCoachPermissions(
	action: CrudAction,
	target: ResourceTarget,
	locals: App.Locals
): Promise<ActionFailure<ErrorMessageState> | undefined> {
	const { user } = locals;

	if (!user) {
		return unauthorized(target, { action });
	}

	const playerCoach = await db.query.coach.findFirst({
		where: {
			userId: user.id,
		},
		columns: { id: true, teamId: true },
	});

	if (!playerCoach) {
		return forbidden(target, { action });
	}

	const modifyingActions: CrudAction[] = ['update', 'delete'];

	if (!modifyingActions.includes(action)) {
		return;
	}

	if (!target.id) {
		throw new Error(
			"This shouldn't happen, pass the player id as a target.id when updating or deleting."
		);
	}

	const targetPlayer = await db.query.player.findFirst({
		where: {
			id: target.id,
		},
		columns: { id: true, teamId: true },
	});

	if (!targetPlayer) {
		return internal(target, { action });
	}

	if (targetPlayer.teamId !== playerCoach.teamId) {
		serverLogger.error(
			`Somehow different team id for player: ${targetPlayer.id} coach: ${playerCoach.id}`
		);
		return internal(target, { action });
	}
}

function handleDbError(err: unknown, target: ResourceTarget, options: ValidationErrorOptions) {
	if (err instanceof DrizzleQueryError && err.cause instanceof SQL.PostgresError) {
		serverLogger.error(err.cause.message);

		if (err.cause.constraint === PLAYER_UNIQUE_JERSEY_PER_TEAM_CONSTRAINT) {
			return validationError<PlayerFormSchema>(
				{
					jerseyNumber: [`Jersey number already taken.`],
				},
				target,
				options
			);
		}
	}
}

export const actions = {
	createTeam: async ({ request, locals }) => {
		const { onboarding, user } = locals;

		if (!onboarding || !user) {
			// this shouldn't run, for defensive and type-safety only
			return internal({ resource: 'team' });
		}

		const data = await request.formData();
		const parsed = createTeamOrgSchema.safeParse(Object.fromEntries(data));

		if (!parsed.success) {
			return parseError(parsed.error, { resource: 'team' });
		}

		const { name, slug } = parsed.data;

		try {
			// TODO: Add check if this is an invited coach or solo coach
			// Check either inviting table or already has an organization
			const teamOrg = await auth.api.createOrganization({
				headers: request.headers,
				body: { name, slug },
			});

			await db.update(organization).set({ type: 'team' }).where(eq(organization.id, teamOrg.id));

			await auth.api.setActiveOrganization({
				body: {
					organizationId: teamOrg.id,
				},
				headers: request.headers,
			});

			serverLogger.info(`Hidden team org created ID: ${teamOrg.id}`);

			const [defaultSeason] = await db
				.insert(season)
				.values({
					name: `Current Season for ${name}`,
					slug: 'current',
					organizationId: teamOrg.id,
				})
				.returning({ id: season.id });

			serverLogger.info(`Default season for team org created ID: ${defaultSeason.id}`);

			const [createdTeam] = await db
				.insert(team)
				.values({ name, slug, seasonId: defaultSeason.id })
				.returning({ id: team.id });

			serverLogger.info(`Team created ID: ${createdTeam.id}`);

			const [createdCoach] = await db
				.insert(coach)
				.values({
					name: user.name,
					teamId: createdTeam.id,
					userId: user.id,
				})
				.returning({ id: coach.id });

			serverLogger.info(`Coach created ID: ${createdCoach.id}`);

			await advanceOnboardingStep(onboarding, 'coach', NEXT_COACH_ONBOARDING_STEP);

			return { action: 'create' };
		} catch (err) {
			const failure = handleOrgAPIError(err, 'team');

			if (isActionFailure(failure)) {
				return failure;
			}

			serverLogger.error(err);
			return internal({ resource: 'team' });
		}
	},
	addPlayer: async ({ request, locals }) => {
		const { onboarding } = locals;

		if (!onboarding) {
			// this shouldn't run, for defensive and type-safety only
			return internal({ resource: 'player' });
		}

		const data = await request.formData();
		const parsed = createPlayerSchema.safeParse(Object.fromEntries(data));

		if (!parsed.success) {
			return parseError(parsed.error, { resource: 'player' });
		}

		const failure = await verifyCoachPermissions('create', { resource: 'player' }, locals);

		if (isActionFailure(failure)) {
			return failure;
		}

		try {
			const [created] = await db
				.insert(player)
				.values({
					...parsed.data,
				})
				.returning({ id: player.id });

			return {
				data: {
					id: created.id,
				},
			};
		} catch (err) {
			const failure = handleDbError(err, { resource: 'player' }, { action: 'create' });

			if (isActionFailure(failure)) {
				return failure;
			}

			serverLogger.error(err);
			return internal({ resource: 'player' });
		}
	},
	updatePlayer: async ({ request, locals }) => {
		const data = await request.formData();
		const parsed = updatePlayerSchema.safeParse(Object.fromEntries(data));

		if (!parsed.success) {
			return parseError(
				parsed.error,
				{ resource: 'player', id: data.get('id')?.toString() },
				{ action: 'update' }
			);
		}

		const playerId = parsed.data.id;

		try {
			const failure = await verifyCoachPermissions(
				'update',
				{ resource: 'player', id: playerId },
				locals
			);

			if (isActionFailure(failure)) {
				return failure;
			}

			await db
				.update(player)
				.set({ ...parsed.data })
				.where(eq(player.id, playerId));
		} catch (err) {
			const failure = handleDbError(
				err,
				{ resource: 'player', id: playerId },
				{ action: 'update' }
			);

			if (isActionFailure(failure)) {
				return failure;
			}

			serverLogger.error(err);
			return internal({ resource: 'player' });
		}
	},
	deletePlayer: async ({ request, locals }) => {
		const data = await request.formData();

		const parsed = idOnlySchema.safeParse(Object.fromEntries(data));

		if (!parsed.success) {
			return parseError(
				parsed.error,
				{ resource: 'player', id: data.get('id')?.toString() },
				{ action: 'delete' }
			);
		}

		const playerId = parsed.data.id;
		const failure = await verifyCoachPermissions(
			'delete',
			{ resource: 'player', id: playerId },
			locals
		);

		if (isActionFailure(failure)) {
			return failure;
		}

		await db.delete(player).where(eq(player.id, playerId));

		serverLogger.info(`Deleted Player ID: ${playerId}`);
	},
	complete: async ({ locals }) => {
		const { onboarding } = locals;

		if (!onboarding) {
			// this shouldn't run, for defensive and type-safety only
			return internal({ resource: 'coach' });
		}

		// TODO: Add the advanceOnboardingStep then redirect, and remove line below
		await new Promise((r) => setTimeout(r, 3000));

		return true;
	},
} satisfies Actions;
