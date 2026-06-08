import { betterAuth } from 'better-auth/minimal';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { env } from '$env/dynamic/private';
import { getRequestEvent } from '$app/server';
import { db } from '$lib/server/db';
import { organization, openAPI } from 'better-auth/plugins';
import type { OrgType } from '$lib/types/auth';

export const auth = betterAuth({
	baseURL: env.ORIGIN,
	secret: env.BETTER_AUTH_SECRET,
	database: drizzleAdapter(db, { provider: 'sqlite' }),
	emailAndPassword: {
		enabled: true,
		requireEmailVerification: false, // FIXME: for dev only
	},
	plugins: [
		openAPI(), // FIXME: maybe for dev only
		organization({
			teams: {
				enabled: true,
				allowRemovingAllTeams: false,
			},
			schema: {
				organization: {
					additionalFields: {
						type: {
							type: 'string',
							input: false,
							defaultValue: 'team' as OrgType,
						},
					},
				},
			},
		}),
		sveltekitCookies(getRequestEvent), // make sure this is the last plugin in the array
	],
});
