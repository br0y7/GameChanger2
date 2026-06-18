import { betterAuth } from 'better-auth/minimal';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { env } from '$env/dynamic/private';
import { getRequestEvent } from '$app/server';
import { db } from '$lib/server/db';
import { organization, admin, openAPI } from 'better-auth/plugins';
import type { OrgType } from '$lib/types/auth';
import * as schema from '$lib/server/db/schema';
import { PUBLIC_APP_URL } from '$env/static/public';
import { dev } from '$app/environment';
import { type BetterAuthPlugin } from 'better-auth';
import { uuidv7 } from 'uuidv7';

const optionalPlugins: BetterAuthPlugin[] = [];

if (dev) {
	optionalPlugins.push(openAPI());
}

export const auth = betterAuth({
	baseURL: env.ORIGIN,
	secret: env.BETTER_AUTH_SECRET,
	database: drizzleAdapter(db, { provider: 'sqlite', schema }),
	emailAndPassword: {
		enabled: true,
		requireEmailVerification: false, // TODO: Eventually set to true and test with a local email server
	},
	trustedOrigins: [PUBLIC_APP_URL],
	socialProviders: {
		google: {
			clientId: env.GOOGLE_CLIENT_ID,
			clientSecret: env.GOOGLE_CLIENT_SECRET,
		},
	},
	advanced: {
		database: {
			generateId: uuidv7,
		},
	},
	plugins: [
		...optionalPlugins,
		organization({
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
		admin(),
		sveltekitCookies(getRequestEvent), // make sure this is the last plugin in the array],
	],
});
