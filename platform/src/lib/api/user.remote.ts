import { db } from '$lib/server/db';
import { count } from 'drizzle-orm';
import * as table from '$lib/server/db/schema';
import { query } from '$app/server';

export const getUserCount = query(async () => {
	const [userCount] = await db.select({ count: count() }).from(table.user);

	return userCount.count;
});
