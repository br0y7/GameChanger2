import { betterAuth } from 'better-auth/minimal';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { env } from '$env/dynamic/private';
import { getRequestEvent } from '$app/server';
import { db } from '$lib/server/db';
import { organization, openAPI } from 'better-auth/plugins';
import type { OrgType } from '$lib/types/auth';
import * as schema from '$lib/server/db/schema';
import { dev } from '$app/environment';

export const auth = betterAuth({
	baseURL: env.ORIGIN,
	secret: env.BETTER_AUTH_SECRET,
	database: drizzleAdapter(db, { provider: 'sqlite', schema }),
	emailAndPassword: {
		enabled: true,
		requireEmailVerification: !dev,
	},
	socialProviders: {
		google: {
			clientId: env.GOOGLE_CLIENT_ID,
			clientSecret: env.GOOGLE_CLIENT_SECRET,
		},
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
