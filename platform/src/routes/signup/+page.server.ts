import { signupFormSchema } from '$lib/schemas/auth';
import { auth } from '$lib/server/auth';
import { internal, parseError } from '$lib/server/fail';
import { serverLogger } from '$lib/server/logger';
import { isAPIError } from 'better-auth/api';

export const actions = {
	default: async ({ request }) => {
		const data = await request.formData();

		const parsed = signupFormSchema.safeParse(Object.fromEntries(data));

		if (!parsed.success) {
			return parseError(parsed.error, { resource: 'auth' }, { action: 'signup' });
		}

		try {
			const {
				user: { id, email },
			} = await auth.api.signUpEmail({
				body: { ...parsed.data },
			});

			serverLogger.info('New user signup', { id, email });
		} catch (error) {
			if (
				isAPIError(error) &&
				error.body?.code === auth.$ERROR_CODES.USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL.code
			) {
				serverLogger.warn('Existing user tried to sign up again.');
				// Return fake success to prevent user enumeration.
				// TODO: Notify existing user to login instead in an email.
				return;
			}

			serverLogger.error(error);

			return internal({ resource: 'auth' });
		}
	},
};
