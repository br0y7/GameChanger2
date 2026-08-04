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
	baseURL: env.BASE_URL,
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
			// For simplicity, a user can only be a member of one organization.
			membershipLimit: 1,
			/// This can be a function that returns a boolean if you want a user
			// to potentially manage multiple leagues, but you want to limit it.
			// One for now for simplicity
			organizationLimit: 1,
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
					// NOTE: This hook will only work if a user is only a member
					// of ONE organization. (see `membershipLimit` above)
					// If that isn't the case then change the code below.
					const member = await db.query.member.findFirst({
						where: { userId: session.userId },
						columns: { organizationId: true },
					});

					if (!member) {
						return { data: session };
					}

					const organization = await db.query.organization.findFirst({
						where: { id: member.organizationId },
						columns: { id: true },
					});

					return {
						data: {
							...session,
							activeOrganizationId: organization?.id,
						},
					};
				},
			},
		},
	},
});

// Prefer to import these types to have all
// the necessary keys/properties.
export type Session = typeof auth.$Infer.Session;
export type User = Session['user'];
