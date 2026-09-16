import { query } from '$app/server';
import { idField } from '$lib/schemas/common';
import { COACH_STATUS } from '$lib/schemas/coach';
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
