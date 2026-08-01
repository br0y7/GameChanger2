import { query } from '$app/server';
import { idField } from '$lib/schemas/common';
import { db } from '$lib/server/db';
import z from 'zod';

export const getCoach = query(
	z.object({
		userId: idField,
		teamId: idField.optional(),
	}),
	async (filters) => await db.query.coach.findFirst({ where: filters })
);
