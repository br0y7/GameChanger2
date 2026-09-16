import { query } from '$app/server';
import { isCoachOnlyUser as checkCoachOnly } from '$lib/server/coach-access.server';
import { getUser } from './auth.remote';

export const isCoachOnlyUser = query(async () => {
	const user = await getUser();
	if (!user) return false;
	return checkCoachOnly(user.id);
});
