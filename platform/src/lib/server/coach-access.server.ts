import {
	COACH_ASSIGNMENT_ROLE,
	COACH_STATUS,
	coachRoleRank,
	type CoachAssignmentRole,
} from '$lib/schemas/coach';
import { db } from '$lib/server/db';
import { forbidden } from '$lib/server/fail';
import { isUserAdmin, requireUser } from '$lib/api/auth.remote';
import { isUserLeagueOrganizer } from '$lib/api/league.remote';


export type TeamCapability = 'view' | 'edit_roster' | 'delete_player' | 'edit_team' | 'enter_stats';

const roleCapabilities: Record<CoachAssignmentRole, readonly TeamCapability[]> = {
	head_coach: ['view', 'edit_roster', 'delete_player', 'edit_team', 'enter_stats'],
	assistant_coach: ['view', 'edit_roster', 'enter_stats'],
	stat_keeper: ['view', 'enter_stats'],
};

export function roleHasCapability(
	role: CoachAssignmentRole,
	capability: TeamCapability
): boolean {
	return roleCapabilities[role].includes(capability);
}

export function meetsMinRole(
	role: CoachAssignmentRole,
	minRole: CoachAssignmentRole
): boolean {
	return coachRoleRank[role] >= coachRoleRank[minRole];
}

export async function getActiveCoachAssignments(userId: string) {
	return db.query.coach.findMany({
		where: {
			userId,
			status: COACH_STATUS.active,
		},
		with: {
			team: {
				with: {
					division: {
						with: {
							season: {
								with: {
									organization: true,
								},
							},
						},
					},
				},
			},
		},
	});
}

export async function getCoachAssignmentForTeam(userId: string, teamId: string) {
	return db.query.coach.findFirst({
		where: {
			userId,
			teamId,
			status: COACH_STATUS.active,
		},
	});
}

export async function getCoachAssignmentsForUserOnTeams(userId: string, teamIds: string[]) {
	if (teamIds.length === 0) return [];
	return db.query.coach.findMany({
		where: {
			userId,
			status: COACH_STATUS.active,
			teamId: { in: teamIds },
		},
	});
}

/** League admin / platform admin, or active coach assignment with capability. */
export async function canAccessTeam(
	teamId: string,
	capability: TeamCapability = 'view'
): Promise<{ ok: true; as: 'admin' | 'coach'; role?: CoachAssignmentRole } | { ok: false }> {
	if ((await isUserAdmin()) || (await isUserLeagueOrganizer())) {
		return { ok: true, as: 'admin' };
	}

	const user = await requireUser();
	const assignment = await getCoachAssignmentForTeam(user.id, teamId);

	if (!assignment) {
		return { ok: false };
	}

	if (!roleHasCapability(assignment.assignmentRole, capability)) {
		return { ok: false };
	}

	return { ok: true, as: 'coach', role: assignment.assignmentRole };
}

export async function requireTeamAccess(
	teamId: string,
	capability: TeamCapability = 'view'
): Promise<{ as: 'admin' | 'coach'; role?: CoachAssignmentRole }> {
	const result = await canAccessTeam(teamId, capability);
	if (!result.ok) {
		forbidden({ resource: 'team' });
	}
	return { as: result.as, role: result.role };
}

export async function canAccessGameStats(
	game: { homeTeamId: string; awayTeamId: string },
	capability: TeamCapability = 'enter_stats'
) {
	if ((await isUserAdmin()) || (await isUserLeagueOrganizer())) {
		return { ok: true as const, as: 'admin' as const };
	}

	const user = await requireUser();
	const assignments = await getCoachAssignmentsForUserOnTeams(user.id, [
		game.homeTeamId,
		game.awayTeamId,
	]);

	const usable = assignments.find((a) => roleHasCapability(a.assignmentRole, capability));
	if (!usable) {
		return { ok: false as const };
	}

	return { ok: true as const, as: 'coach' as const, role: usable.assignmentRole };
}

export async function requireGameStatsAccess(
	game: { homeTeamId: string; awayTeamId: string },
	capability: TeamCapability = 'enter_stats'
) {
	const result = await canAccessGameStats(game, capability);
	if (!result.ok) {
		forbidden({ resource: 'game' });
	}
	return result;
}

export async function isCoachOnlyUser(userId?: string): Promise<boolean> {
	if ((await isUserAdmin()) || (await isUserLeagueOrganizer())) {
		return false;
	}
	const id = userId ?? (await requireUser()).id;
	const assignments = await getActiveCoachAssignments(id);
	return assignments.length > 0;
}

export async function getLeagueOrgIdForTeam(teamId: string): Promise<string | null> {
	const team = await db.query.team.findFirst({
		where: { id: teamId },
		with: {
			division: {
				with: {
					season: true,
				},
			},
		},
	});
	return team?.division?.season?.organizationId ?? null;
}

export { COACH_ASSIGNMENT_ROLE, COACH_STATUS };
