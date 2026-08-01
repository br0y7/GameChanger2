import { requireUser } from '$lib/api/auth.remote';

export const load = async () => {
	await requireUser();
};
