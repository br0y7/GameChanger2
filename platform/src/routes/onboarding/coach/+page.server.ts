import { auth } from '$lib/server/auth.js';
import { db } from '$lib/server/db/index.js';
import { serverLogger } from '$lib/server/logger.js';
import { redirect } from '@sveltejs/kit';
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
	userOnboarding,
	type Onboarding,
} from '$lib/server/db/schema';
import { APIError } from 'better-auth';
import { NEXT_COACH_ONBOARDING_STEP, type CoachOnboardingStep } from '$lib/onboarding/steps.js';
import { isValidOnboarding } from '$lib/server/guards.js';
import { createTeamOrgSchema, type TeamOrgFormSchema } from '$lib/schemas/team';
import {
	forbidden,
	internal,
	parseError,
	unauthorized,
	validationError,
} from '$lib/server/fail.js';
import { createPlayerSchema, type PlayerFormSchema } from '$lib/schemas/player.js';
import { SQL } from 'bun';
import { idOnlySchema } from '$lib/schemas/common.js';

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

async function advanceOnboardingStep(onboarding: Onboarding) {
	const currentStep = onboarding.currentStep as CoachOnboardingStep;
	const nextOnboardingStep = NEXT_COACH_ONBOARDING_STEP[currentStep];
	const status: Onboarding['status'] = nextOnboardingStep === 'done' ? 'complete' : 'in_progress';

	serverLogger.info(
		`Coach Onboarding | USER: ${onboarding.userId} STATUS: ${status} STEP: ${currentStep} -> ${nextOnboardingStep}`
	);

	await db
		.update(userOnboarding)
		.set({
			currentStep: nextOnboardingStep,
			status,
		})
		.where(eq(userOnboarding.id, onboarding.id));
}

export const actions = {
	createTeam: async ({ request, locals }) => {
		const { onboarding, user } = locals;

		if (!onboarding || !user) {
			// this shouldn't run, for defensive and type-safety only
			return internal();
		}

		const data = await request.formData();
		const parsed = createTeamOrgSchema.safeParse(Object.fromEntries(data));

		if (!parsed.success) {
			return parseError(parsed.error);
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

			await advanceOnboardingStep(onboarding);

			return {
				data: {
					id: createdTeam.id,
				},
			};
		} catch (err) {
			if (err instanceof APIError && err.body) {
				serverLogger.error(err, err.body);

				const { $ERROR_CODES } = auth;

				switch (err.body.code) {
					case $ERROR_CODES.ORGANIZATION_ALREADY_EXISTS.code:
					case $ERROR_CODES.ORGANIZATION_SLUG_ALREADY_TAKEN.code:
						return validationError<TeamOrgFormSchema>({
							slug: [`The slug '${slug}' is already taken. Please use a different one.`],
						});
					case $ERROR_CODES.YOU_ARE_NOT_ALLOWED_TO_CREATE_A_NEW_ORGANIZATION.code:
					case $ERROR_CODES.YOU_HAVE_REACHED_THE_MAXIMUM_NUMBER_OF_ORGANIZATIONS.code:
						return forbidden('You are not allowed to make a team.');
				}
			}

			serverLogger.error(err);
			return internal();
		}
	},
	addPlayer: async ({ request, locals }) => {
		const { onboarding } = locals;

		if (!onboarding) {
			// this shouldn't run, for defensive and type-safety only
			return internal();
		}

		const data = await request.formData();
		const parsed = createPlayerSchema.safeParse(Object.fromEntries(data));

		if (!parsed.success) {
			return parseError(parsed.error);
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
			if (err instanceof DrizzleQueryError && err.cause instanceof SQL.PostgresError) {
				serverLogger.error(err.cause.message);

				if (err.cause.constraint === PLAYER_UNIQUE_JERSEY_PER_TEAM_CONSTRAINT) {
					return validationError<PlayerFormSchema>({
						jerseyNumber: [`Jersey number ${parsed.data.jerseyNumber} already exists.`],
					});
				}
			}

			serverLogger.error(err);
			return internal();
		}
	},
	deletePlayer: async ({ request, locals }) => {
		const data = await request.formData();

		const parsed = idOnlySchema.safeParse(Object.fromEntries(data));

		if (!parsed.success) {
			return parseError(parsed.error);
		}

		const { user } = locals;

		if (!user) {
			return unauthorized();
		}

		const coach = await db.query.coach.findFirst({
			where: {
				userId: user.id,
			},
			with: {
				team: true,
			},
		});

		if (!coach) {
			return forbidden();
		}

		const { id } = parsed.data;

		const playerToBeDeleted = await db.query.player.findFirst({
			where: { id },
		});

		if (!playerToBeDeleted) {
			serverLogger.warn(`Player ID: ${id} already deleted.`);
			return;
		}

		await db.delete(player).where(eq(player.id, id));

		serverLogger.info(`Deleted Player ID: ${id}`);
	},
	complete: async ({ locals }) => {
		const { onboarding } = locals;

		if (!onboarding) {
			// this shouldn't run, for defensive and type-safety only
			return internal();
		}

		// TODO: Add the redirect and remove this
		await new Promise((r) => setTimeout(r, 3000));

		return true;
	},
} satisfies Actions;
