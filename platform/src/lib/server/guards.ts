import { auth } from './auth';

export async function isAdmin(userId: string) {
	try {
		const user = await auth.api.getUser({ query: { id: userId } });

		return user.role === 'admin';
	} catch {
		return false;
	}
}
