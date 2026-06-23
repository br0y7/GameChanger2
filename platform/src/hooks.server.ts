import type { Handle } from '@sveltejs/kit';
import { building } from '$app/environment';
import { auth } from '$lib/server/auth';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { db } from '$lib/server/db';
import { userOnboarding } from '$lib/server/db/schema';

const handleBetterAuth: Handle = async ({ event, resolve }) => {
	const sessionData = await auth.api.getSession({ headers: event.request.headers });

	if (sessionData) {
		const { session, user } = sessionData;
		event.locals.session = session;
		event.locals.user = user;

		let onboarding = await db.query.userOnboarding.findFirst({
			where: {
				userId: user.id,
			},
		});

		if (!onboarding) {
			// This won't run, just for type safety, there is a db hook in auth.ts.
			const [created] = await db
				.insert(userOnboarding)
				.values({
					userId: user.id,
				})
				.returning();

			onboarding = created;
		}

		event.locals.onboarding = onboarding;
	}

	return svelteKitHandler({ event, resolve, auth, building });
};

export const handle: Handle = handleBetterAuth;
