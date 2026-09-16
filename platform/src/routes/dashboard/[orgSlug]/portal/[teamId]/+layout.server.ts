import { resolve } from '$app/paths';
import { redirect } from '@sveltejs/kit';
import { getCoachAssignmentForTeamQuery } from '$lib/api/coach-portal.remote';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ params }) => {
	const assignment = await getCoachAssignmentForTeamQuery({ teamId: params.teamId });
	if (!assignment) {
		redirect(303, resolve('/dashboard/[orgSlug]/portal', { orgSlug: params.orgSlug }));
	}
	return { assignmentId: assignment.id };
};
