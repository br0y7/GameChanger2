import { query } from '$app/server';
import { idField } from '$lib/schemas/common';
import { COACH_STATUS } from '$lib/schemas/coach';
import { canAccessTeam } from '$lib/server/coach-access.server';
import { getUser, requireUser } from './auth.remote';
import { db } from '$lib/server/db';
import { z } from 'zod';

export const getCoachAssignmentForTeamQuery = query(
	z.object({ teamId: idField }),
	async ({ teamId }) => {
		const user = await requireUser();
		return db.query.coach.findFirst({
			where: {
				userId: user.id,
				teamId,
				status: COACH_STATUS.active,
			},
			with: {
				team: {
					with: {
						division: {
							with: {
								season: {
									with: { organization: true },
								},
							},
						},
					},
				},
			},
		});
	}
);

/** Team season context for the coach portal. Admins can open any team. */
export const getPortalTeamContext = query(z.object({ teamId: idField }), async ({ teamId }) => {
	const access = await canAccessTeam(teamId, 'view');
	if (!access.ok) return null;

	const team = await db.query.team.findFirst({
		where: { id: teamId },
		with: {
			division: {
				with: {
					season: true,
				},
			},
		},
	});

	if (!team?.division?.season) return null;

	return {
		teamId: team.id,
		division: {
			id: team.division.id,
			slug: team.division.slug,
			name: team.division.name,
		},
		season: {
			id: team.division.season.id,
			slug: team.division.season.slug,
			name: team.division.season.name,
		},
	};
});

/** Returns null when logged out (no redirect). */
export const getMyTeamCoachAssignment = query(z.object({ teamId: idField }), async ({ teamId }) => {
	const user = await getUser();
	if (!user) return null;
	return db.query.coach.findFirst({
		where: {
			userId: user.id,
			teamId,
			status: COACH_STATUS.active,
		},
	});
});
