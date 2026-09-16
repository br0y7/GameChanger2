import { query } from '$app/server';
import { getUser } from './auth.remote';
import { isFamilyOnlyUser as checkFamilyOnly } from '$lib/server/family-access.server';

export const isFamilyOnlyUser = query(async () => {
	const user = await getUser();
	if (!user) return false;
	return checkFamilyOnly(user.id);
});
