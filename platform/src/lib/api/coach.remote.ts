import { query } from '$app/server';
import { idOnlySchema } from '$lib/schemas/common';
import { db } from '$lib/server/db';

export const getCoachWithUser = query(
	idOnlySchema,
	async ({ id }) => await db.query.coach.findFirst({ where: { userId: id } })
);
