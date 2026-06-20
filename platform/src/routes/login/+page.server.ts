import { auth } from '$lib/server/auth';
import { serverLogger } from '$lib/server/logger';
import { fail } from '@sveltejs/kit';
import { isAPIError } from 'better-auth/api';
import { z } from 'zod';

const loginFormSchema = z.object({
	email: z.email('Email is invalid.'),
	password: z.string().min(1, 'Password is required.'),
});

export const actions = {
	default: async ({ request }) => {
		const data = await request.formData();

		const result = loginFormSchema.safeParse(Object.fromEntries(data));

		if (!result.success) {
			return fail(400, {
				errors: z.flattenError(result.error).fieldErrors,
			});
		}

		try {
			const {
				user: { id },
			} = await auth.api.signInEmail({
				body: { ...result.data },
			});

			serverLogger.info('User logged in', { id });
		} catch (error) {
			if (
				isAPIError(error) &&
				error.body?.code === auth.$ERROR_CODES.INVALID_EMAIL_OR_PASSWORD.code
			) {
				serverLogger.error(error);

				return fail(400, {
					error: { message: 'Invalid email or password' },
				});
			}

			serverLogger.error(error);

			return fail(500, {
				error: { message: 'Something went wrong' },
			});
		}

		return { success: true };
	},
};
