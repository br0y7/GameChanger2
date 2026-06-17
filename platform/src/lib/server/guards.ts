import { auth } from './auth';

export async function isAdmin() {
	try {
		const { success } = await auth.api.userHasPermission({
			body: {
				role: 'admin',
				permissions: {
					user: ['ban'],
				},
			},
		});
		return success;
	} catch {
		return false;
	}
}
