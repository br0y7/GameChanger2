import { auth } from '$lib/server/auth';
import { serverLogger } from '$lib/server/logger';
import { fail } from '@sveltejs/kit';
import { isAPIError } from 'better-auth/api';
import { z } from 'zod';

const signupFormSchema = z.object({
	name: z.string().min(2, 'Name must be at least 2 characters'),
	email: z.email('Invalid email'),
	password: z.string().min(8, 'Password must be at least 8 characters.'),
});

export const actions = {
	default: async ({ request }) => {
		const data = await request.formData();

		const result = signupFormSchema.safeParse(Object.fromEntries(data));

		if (!result.success) {
			return fail(400, {
				errors: z.flattenError(result.error).fieldErrors,
			});
		}

		try {
			const {
				user: { id, email },
			} = await auth.api.signUpEmail({
				body: { ...result.data },
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
				return { success: true };
			}

			serverLogger.error(error);

			return fail(500, {
				error: {
					message: 'Something went wrong',
				},
			});
		}

		return { success: true };
	},
};
