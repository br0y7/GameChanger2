import { resolve } from '$app/paths';
import { redirect } from '@sveltejs/kit';
import { clearDemoAccessCookie } from '$lib/server/demo-access.server';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ cookies, url }) => {
	clearDemoAccessCookie(cookies, url.protocol === 'https:');
	redirect(303, resolve('/'));
};
