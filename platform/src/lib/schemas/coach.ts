import { z } from 'zod';
import { idField } from './common';

export const coachAssignmentRoles = ['head_coach', 'assistant_coach', 'stat_keeper'] as const;
export type CoachAssignmentRole = (typeof coachAssignmentRoles)[number];

export const coachStatuses = ['invited', 'active', 'expired', 'removed'] as const;
export type CoachStatus = (typeof coachStatuses)[number];

export const COACH_ASSIGNMENT_ROLE = {
	head_coach: 'head_coach',
	assistant_coach: 'assistant_coach',
	stat_keeper: 'stat_keeper',
} as const satisfies Record<CoachAssignmentRole, CoachAssignmentRole>;

export const COACH_STATUS = {
	invited: 'invited',
	active: 'active',
	expired: 'expired',
	removed: 'removed',
} as const satisfies Record<CoachStatus, CoachStatus>;

/** Capability rank: higher can do everything lower can (with exceptions for settings/delete). */
export const coachRoleRank: Record<CoachAssignmentRole, number> = {
	stat_keeper: 1,
	assistant_coach: 2,
	head_coach: 3,
};

export const coachAssignmentRoleSchema = z.enum(coachAssignmentRoles);
export const coachStatusSchema = z.enum(coachStatuses);

export const inviteCoachSchema = z.object({
	email: z.email(),
	teamId: idField,
	assignmentRole: coachAssignmentRoleSchema.default('head_coach'),
	name: z.string().trim().max(100).optional(),
});

export type InviteCoachSchema = z.infer<typeof inviteCoachSchema>;

export const changeCoachTeamSchema = z.object({
	id: idField,
	teamId: idField,
});

export const coachRoleLabels: Record<CoachAssignmentRole, string> = {
	head_coach: 'Head Coach',
	assistant_coach: 'Assistant Coach',
	stat_keeper: 'Stat Keeper',
};

export const coachStatusLabels: Record<CoachStatus, string> = {
	invited: 'Invited',
	active: 'Active',
	expired: 'Expired',
	removed: 'Removed',
};
