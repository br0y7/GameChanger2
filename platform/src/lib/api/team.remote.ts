import { form, getRequestEvent, query } from '$app/server';
import { createTeamSchema } from '$lib/schemas/team';
import { auth } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { getUser } from './auth.remote';
import { serverLogger } from '$lib/server/logger';
import { invalid } from '@sveltejs/kit';
import { internal } from '$lib/server/fail';
import { getOnboardingWithUser } from './onboarding.remote';
import { NEXT_COACH_ONBOARDING_STEP } from '$lib/onboarding/steps';
import { isAPIError } from 'better-auth/api';
import { advanceOnboardingStep } from './onboarding.server';
import { requiredId } from '$lib/schemas/common';
import { getCoachWithUser } from './coach.remote';
import { z } from 'zod';
import * as table from '$lib/server/db/schema';

export const createTeam = form(createTeamSchema, async (data, issue) => {
	const user = await getUser();

	const { name, slug, flow } = data;
	let { divisionId } = data;

	const {
		request: { headers },
	} = getRequestEvent();

	if (flow === 'solo-coach') {
		try {
			divisionId = await db.transaction(async (tx) => {
				const teamOrg = await auth.api.createOrganization({
					headers,
					body: { name, slug },
				});

				await tx
					.update(table.organization)
					.set({ type: 'team' })
					.where(eq(table.organization.id, teamOrg.id));

				await auth.api.setActiveOrganization({
					body: {
						organizationId: teamOrg.id,
					},
					headers,
				});

				serverLogger.info(`hidden team org created: ${teamOrg.id}`);

				const [defaultSeason] = await tx
					.insert(table.season)
					.values({
						name: `Current Season for ${name}`,
						slug: 'current',
						organizationId: teamOrg.id,
					})
					.returning({ id: table.season.id });

				serverLogger.info(`default season for team org created: ${defaultSeason.id}`);

				const [defaultDivision] = await tx
					.insert(table.division)
					.values({
						name: `Division for ${name}`,
						slug: `${slug}-division`,
						seasonId: defaultSeason.id,
					})
					.returning({ id: table.division.id });

				serverLogger.info(`default division for team org created: ${defaultDivision.id}`);

				return defaultDivision.id;
			});
		} catch (err) {
			if (isAPIError(err) && err.body) {
				serverLogger.error(err, err.body);

				const { $ERROR_CODES } = auth;

				switch (err.body.code) {
					case $ERROR_CODES.ORGANIZATION_ALREADY_EXISTS.code:
					case $ERROR_CODES.ORGANIZATION_SLUG_ALREADY_TAKEN.code:
						return invalid(issue.slug('Slug already exists.'));
					case $ERROR_CODES.YOU_ARE_NOT_ALLOWED_TO_CREATE_A_NEW_ORGANIZATION.code:
					case $ERROR_CODES.YOU_HAVE_REACHED_THE_MAXIMUM_NUMBER_OF_ORGANIZATIONS.code:
						return invalid(`You are not allowed to make a team.`);
				}
			}

			serverLogger.error(err);
			return invalid('Something went wrong.');
		}
	}

	if (!divisionId) {
		switch (flow) {
			case 'standard':
				return invalid(issue.divisionId('Division is required.'));
			case 'solo-coach':
				return internal({ resource: 'team' }, { message: 'Unreachable code ran in createTeam.' });
		}
	}

	const [createdTeam] = await db
		.insert(table.team)
		.values({
			name,
			slug,
			divisionId,
		})
		.returning({ id: table.team.id });

	serverLogger.info(`team created ${createdTeam.id}`);

	if (flow === 'solo-coach') {
		const [createdCoach] = await db
			.insert(table.coach)
			.values({
				name: user.name,
				userId: user.id,
				teamId: createdTeam.id,
			})
			.returning({ id: table.coach.id });

		serverLogger.info(`coach created ${createdCoach.id}`);

		const onboarding = await getOnboardingWithUser({ id: user.id });

		await advanceOnboardingStep(onboarding, NEXT_COACH_ONBOARDING_STEP);

		// refresh the queries to update the page
		void getOnboardingWithUser({ id: user.id }).refresh();
		void getCoachWithUser({ id: user.id }).refresh();
	}
});

export const getTeam = query(
	z.object({
		...requiredId,
		include: z
			.object({
				players: z.boolean().optional(),
				coaches: z.boolean().optional(),
				division: z.boolean().optional(),
			})
			.default({}),
	}),
	async ({ id, include }) => await db.query.team.findFirst({ where: { id }, with: include })
);
