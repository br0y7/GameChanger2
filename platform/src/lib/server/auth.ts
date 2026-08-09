import { betterAuth } from 'better-auth/minimal';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { env } from '$env/dynamic/private';
import { getRequestEvent } from '$app/server';
import { db } from '$lib/server/db';
import { organization, admin, openAPI } from 'better-auth/plugins';
import * as table from '$lib/server/db/schema';
import { dev } from '$app/environment';
import { type BetterAuthPlugin } from 'better-auth';
import { type Organization } from '$lib/server/db/schema';
import { serverLogger } from './logger';
import { ORG_CREATOR_ROLES } from '$lib/onboarding/roles';
import {
	COACH_START_STEP,
	ONBOARDING_DONE_STEP,
	ORGANIZER_START_STEP,
} from '$lib/onboarding/steps';
import { USER_ROLE } from '$lib/schemas/user';
import { getUserCount } from '$lib/api/user.remote';
import { isAdmin } from '$lib/api/user.server';

const optionalPlugins: BetterAuthPlugin[] = [];

if (dev) {
	optionalPlugins.push(openAPI());
}

export const auth = betterAuth({
	baseURL: env.ORIGIN,
	secret: env.BETTER_AUTH_SECRET,
	database: drizzleAdapter(db, { provider: 'pg', schema: table }),
	emailAndPassword: {
		enabled: true,
		requireEmailVerification: false, // TODO: Eventually set to true and test with a local email server
	},
	socialProviders: {
		google: {
			clientId: env.GOOGLE_CLIENT_ID,
			clientSecret: env.GOOGLE_CLIENT_SECRET,
		},
	},
	advanced: {
		database: {
			generateId: false,
		},
	},
	plugins: [
		organization({
			schema: {
				organization: {
					additionalFields: {
						type: {
							type: 'string',
							input: false,
							defaultValue: 'league' as Organization['type'],
						},
					},
				},
			},
			// Returns true when a user has reached their organization limit
			// For simplicity, ordinary users can belong to one org
			// Admins have no limits
			organizationLimit: async (user) => {
				if (isAdmin(user as User)) {
					return false;
				}

				const member = await db.query.member.findFirst({ where: { userId: user.id } });

				return !!member;
			},
			allowUserToCreateOrganization: async (user) => {
				try {
					if (isAdmin(user as User)) return true;

					const onboarding = await db.query.userOnboarding.findFirst({
						where: {
							userId: user.id,
						},
					});

					const ORG_CREATOR_SET = new Set<string>(ORG_CREATOR_ROLES);

					if (!onboarding || !onboarding.role || !ORG_CREATOR_SET.has(onboarding.role)) {
						return false;
					}

					const ALLOWED_STEPS = new Set<string>([ORGANIZER_START_STEP, COACH_START_STEP]);

					return ALLOWED_STEPS.has(onboarding.currentStep);
				} catch (err) {
					serverLogger.error(err);
					return false;
				}
			},
		}),
		admin(),
		...optionalPlugins,
		sveltekitCookies(getRequestEvent), // make sure this is the last plugin in the array,
	],
	databaseHooks: {
		user: {
			create: {
				before: async (user) => {
					if ((await getUserCount()) > 0) {
						return {
							data: user,
						};
					}

					serverLogger.info('creating first admin account');

					return {
						data: {
							...user,
							role: USER_ROLE.admin,
						},
					};
				},
				after: async (user) => {
					await db.insert(table.userOnboarding).values({
						userId: user.id,
						...(isAdmin(user as User) && {
							status: 'complete',
							currentStep: ONBOARDING_DONE_STEP,
						}),
					});

					// void, no need to wait
					void getUserCount().refresh();
				},
			},
		},
		session: {
			create: {
				before: async (session) => {
					const memberships = await db.query.member.findMany({
						where: { userId: session.userId },
						with: {
							organization: true,
						},
					});

					if (memberships.length === 0) {
						return { data: session };
					}

					// Prefer to use admin org id.
					const activeOrganizationId =
						memberships.find((m) => m.organization?.type === 'system')?.organizationId ??
						memberships[0].organizationId;

					return {
						data: {
							...session,
							activeOrganizationId,
						},
					};
				},
			},
		},
	},
});

// Prefer to import these types to have all
// the necessary keys/properties.
export type AuthSession = typeof auth.$Infer.Session;
export type Session = AuthSession['session'];
export type User = AuthSession['user'];
