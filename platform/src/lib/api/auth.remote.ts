import { resolve } from '$app/paths';
import { form, getRequestEvent, query } from '$app/server';
import { loginFormSchema, signupFormSchema } from '$lib/schemas/auth';
import { auth } from '$lib/server/auth';
import { serverLogger } from '$lib/server/logger';
import { invalid, isRedirect, redirect } from '@sveltejs/kit';
import { isAPIError } from 'better-auth/api';

export const loginWithEmail = form(loginFormSchema, async (data) => {
	try {
		const { user } = await auth.api.signInEmail({
			body: { ...data },
		});

		serverLogger.info('user logged in', user.id);

		redirect(303, resolve('/onboarding'));
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
		const { user } = await auth.api.signUpEmail({
			body: { ...data },
		});

		serverLogger.info('new user sign up', user.id);

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
			// Compromise user enumeration for UX, rely on BetterAuth rate limit
			return redirect(303, resolve(`/login?email=${data.email}`));
		}

		serverLogger.error(err);

		return invalid('Something went wrong');
	}
});

const requireAuth = async () => {
	const authSession = await auth.api.getSession({
		headers: getRequestEvent().request.headers,
	});

	if (!authSession) {
		redirect(303, resolve('/login'));
	}

	return authSession;
};

export const requireUser = query(async () => (await requireAuth()).user);
export const requireSession = query(async () => (await requireAuth()).session);
