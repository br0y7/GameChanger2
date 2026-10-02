import type { Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { building } from '$app/environment';
import { auth } from '$lib/server/auth';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import {
	clearDemoAccessCookie,
	DEMO_ACCESS_COOKIE,
	loadDemoAccessByToken,
} from '$lib/server/demo-access.server';

const handleDemoAccess: Handle = async ({ event, resolve }) => {
	const token = event.cookies.get(DEMO_ACCESS_COOKIE);
	if (!token) {
		event.locals.demoAccess = null;
		return resolve(event);
	}

	const access = await loadDemoAccessByToken(token);
	if (!access) {
		clearDemoAccessCookie(event.cookies, event.url.protocol === 'https:');
		event.locals.demoAccess = null;
		return resolve(event);
	}

	event.locals.demoAccess = access;
	return resolve(event);
};

const handleBetterAuth: Handle = async ({ event, resolve }) => {
	return svelteKitHandler({ event, resolve, auth, building });
};

export const handle: Handle = sequence(handleDemoAccess, handleBetterAuth);
