import { auth } from '$lib/server/auth';
import { serverLogger } from '$lib/server/logger';
import { isAPIError } from 'better-auth/api';
import { badRequest, internal, parseError } from '$lib/server/fail';
import { loginFormSchema } from '$lib/schemas/auth';

export const actions = {
	default: async ({ request }) => {
		const data = await request.formData();

		const parsed = loginFormSchema.safeParse(Object.fromEntries(data));

		if (!parsed.success) {
			return parseError(parsed.error, { resource: 'auth' }, { action: 'login' });
		}

		try {
			const {
				user: { id },
			} = await auth.api.signInEmail({
				body: { ...parsed.data },
			});

			serverLogger.info('User logged in', { id });
		} catch (error) {
			if (
				isAPIError(error) &&
				error.body?.code === auth.$ERROR_CODES.INVALID_EMAIL_OR_PASSWORD.code
			) {
				serverLogger.error(error);

				return badRequest(
					{ resource: 'auth' },
					{ action: 'login', message: 'Invalid email or password' }
				);
			}

			serverLogger.error(error);

			return internal({ resource: 'auth' });
		}
	},
};
