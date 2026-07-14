import { requireAdmin } from '$lib/api/auth.remote';

export const load = async () => {
	await requireAdmin();
};
