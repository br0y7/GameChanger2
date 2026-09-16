import { resolve } from '$app/paths';
import { form, getRequestEvent, query } from '$app/server';
import type { Pathname } from '$app/types';
import { loginFormSchema, signupFormSchema } from '$lib/schemas/auth';
import { USER_ROLE } from '$lib/schemas/user';
import { auth } from '$lib/server/auth';
import { forbidden } from '$lib/server/fail';
import { serverLogger } from '$lib/server/logger';
import { DASHBOARD_PATH, REDIRECT_TO_PARAM } from '$lib/utils/url';
import { invalid, isRedirect, redirect } from '@sveltejs/kit';
import { isAPIError } from 'better-auth/api';
import { z } from 'zod';
import { resolvePostLoginPath } from './auth.server';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { AWAITING_INVITE_STEP, ORGANIZER_START_STEP } from '$lib/onboarding/steps';

export const loginWithEmail = form(loginFormSchema, async (data) => {
	try {
		const {
			user: { id },
		} = await auth.api.signInEmail({
			body: {
				email: data.email,
				password: data.password,
			},
		});

		serverLogger.info('logged in', { id });

		const { url } = getRequestEvent();
		const redirectTo = data.redirectTo || url.searchParams.get(REDIRECT_TO_PARAM);
		const safeRedirect =
			redirectTo &&
			(redirectTo.startsWith(DASHBOARD_PATH) || redirectTo.startsWith('/invite/'));

		// Session cookie is applied on the next request — send to /dashboard (or a
		// safe deep link) and let layout resolve coach/family portal landing.
		redirect(303, safeRedirect ? redirectTo : DASHBOARD_PATH);
	} catch (err) {
		if (isRedirect(err)) {
			throw err;
		}

		if (isAPIError(err) && err.body?.code) {
			serverLogger.error(err);
			switch (err.body.code) {
				case auth.$ERROR_CODES.INVALID_EMAIL_OR_PASSWORD.code:
				case auth.$ERROR_CODES.USER_NOT_FOUND.code:
					return invalid('Invalid email or password');
			}
		}

		serverLogger.error(err);

		return invalid('Something went wrong');
	}
});

export const signUpWithEmail = form(signupFormSchema, async (data) => {
	try {
		const { redirectTo, role, ...credentials } = data;
		const {
			user: { id },
		} = await auth.api.signUpEmail({
			body: credentials,
		});

		serverLogger.info('new user', { id, role });

		const safeRedirect =
			redirectTo &&
			(redirectTo.startsWith(DASHBOARD_PATH) || redirectTo.startsWith('/invite/'));

		// Invite accept flow should return to the invite link.
		if (safeRedirect) {
			const inferredRole = redirectTo.startsWith('/invite/family')
				? 'player_follower'
				: redirectTo.startsWith('/invite/coach')
					? 'coach'
					: null;
			if (inferredRole) {
				await db
					.update(table.userOnboarding)
					.set({
						role: inferredRole,
						status: 'in_progress',
						currentStep: AWAITING_INVITE_STEP,
					})
					.where(eq(table.userOnboarding.userId, id));
			}
			redirect(303, redirectTo);
		}

		if (role === 'organizer') {
			await db
				.update(table.userOnboarding)
				.set({
					role: 'organizer',
					status: 'in_progress',
					currentStep: ORGANIZER_START_STEP,
				})
				.where(eq(table.userOnboarding.userId, id));
			redirect(303, resolve('/onboarding/league-organizer'));
		}

		if (role === 'coach' || role === 'player_follower') {
			await db
				.update(table.userOnboarding)
				.set({
					role,
					status: 'in_progress',
					currentStep: AWAITING_INVITE_STEP,
				})
				.where(eq(table.userOnboarding.userId, id));
			redirect(303, resolve('/onboarding/awaiting-invite'));
		}

		redirect(303, resolve('/onboarding'));
	} catch (err) {
		if (isRedirect(err)) {
			throw err;
		}

		if (
			isAPIError(err) &&
			err.body?.code === auth.$ERROR_CODES.USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL.code
		) {
			serverLogger.warn('existing user tried to sign up again', data.email);
			return invalid('This email is already being used');
		}

		serverLogger.error(err);

		return invalid('Something went wrong');
	}
});

const getAuthSession = async () =>
	await auth.api.getSession({
		headers: getRequestEvent().request.headers,
	});

export const getUser = query(async () => (await getAuthSession())?.user);

const requireAuth = async () => {
	const authSession = await getAuthSession();

	if (!authSession) {
		const { url } = getRequestEvent();
		const redirectURL = new URL(resolve('/login'), url.origin);

		const DASHBOARD_PATH: Pathname = '/dashboard';
		if (url.pathname.startsWith(DASHBOARD_PATH)) {
			redirectURL.searchParams.set(REDIRECT_TO_PARAM, url.pathname);
		}

		redirect(303, redirectURL);
	}

	return authSession;
};

export const requireUser = query(async () => (await requireAuth()).user);
export const requireSession = query(async () => (await requireAuth()).session);

export const isAuthenticated = query(async () => !!(await getAuthSession()));
export const isUserAdmin = query(async () => {
	const authSession = await getAuthSession();

	if (!authSession) {
		return false;
	}

	return authSession.user?.role?.trim() === USER_ROLE.admin;
});

export const requireAdmin = query(async () => {
	const user = await requireUser();

	if (!(await isUserAdmin())) {
		forbidden({ resource: 'user' });
	}

	return user;
});

export const getPostLoginRedirect = query(
	z.object({ redirectTo: z.string().nullable().optional() }),
	async ({ redirectTo }) => resolvePostLoginPath(redirectTo)
);
