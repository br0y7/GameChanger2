import { resolve } from '$app/paths';
import { redirect } from '@sveltejs/kit';
import { writeAdminViewAsCookie } from '$lib/api/view-as';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ cookies, params }) => {
	writeAdminViewAsCookie(cookies, 'admin');
	redirect(303, resolve('/dashboard/[orgSlug]', { orgSlug: params.orgSlug }));
};
