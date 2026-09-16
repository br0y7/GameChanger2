import { form, getRequestEvent, query } from '$app/server';
import { resolve } from '$app/paths';
import { idField, idOnlySchema } from '$lib/schemas/common';
import {
	COACH_STATUS,
	changeCoachTeamSchema,
	coachStatusLabels,
	inviteCoachSchema,
} from '$lib/schemas/coach';
import { auth } from '$lib/server/auth';
import {
	getActiveCoachAssignments,
	getLeagueOrgIdForTeam,
} from '$lib/server/coach-access.server';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { forbidden, notFound } from '$lib/server/fail';
import { serverLogger } from '$lib/server/logger';
import { ONBOARDING_DONE_STEP } from '$lib/onboarding/steps';
import { invalid, isRedirect, redirect } from '@sveltejs/kit';
import { and, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { isUserAdmin, getUser, requireUser } from './auth.remote';
import { isUserLeagueOrganizer } from './league.remote';

const INVITE_DAYS = 14;

function inviteAcceptPath(token: string) {
	return `/invite/coach/${token}`;
}

function absoluteInviteUrl(token: string) {
	const { url } = getRequestEvent();
	return new URL(inviteAcceptPath(token), url.origin).toString();
}

async function requireOrganizerOrAdmin() {
	if ((await isUserAdmin()) || (await isUserLeagueOrganizer())) {
		return;
	}
	forbidden({ resource: 'coach' });
}

export const getCoach = query(
	z.object({
		userId: idField,
		teamId: idField.optional(),
	}),
	async (filters) =>
		await db.query.coach.findFirst({
			where: {
				...filters,
				status: { in: [COACH_STATUS.active, COACH_STATUS.invited] },
			},
		})
);

export const getMyCoachAssignments = query(async () => {
	const user = await requireUser();
	return getActiveCoachAssignments(user.id);
});

export const listLeagueCoaches = query(
	z.object({
		organizationId: idField,
		seasonId: idField.optional(),
	}),
	async ({ organizationId, seasonId }) => {
		await requireOrganizerOrAdmin();

		const seasons = await db.query.season.findMany({
			where: seasonId ? { id: seasonId, organizationId } : { organizationId },
			columns: { id: true, name: true, slug: true },
			with: {
				divisions: {
					columns: { id: true },
					with: {
						teams: {
							columns: { id: true, name: true, slug: true },
						},
					},
				},
			},
		});

		const teamMeta = new Map<
			string,
			{ teamName: string; teamSlug: string; seasonId: string; seasonName: string; seasonSlug: string }
		>();

		for (const season of seasons) {
			for (const division of season.divisions) {
				for (const team of division.teams) {
					teamMeta.set(team.id, {
						teamName: team.name,
						teamSlug: team.slug,
						seasonId: season.id,
						seasonName: season.name,
						seasonSlug: season.slug,
					});
				}
			}
		}

		const teamIds = [...teamMeta.keys()];
		if (teamIds.length === 0) return [];

		const coaches = await db.query.coach.findMany({
			where: {
				teamId: { in: teamIds },
				status: { in: [COACH_STATUS.invited, COACH_STATUS.active, COACH_STATUS.expired] },
			},
			orderBy: { createdAt: 'desc' },
		});

		return coaches.map((coach) => {
			const meta = teamMeta.get(coach.teamId)!;
			return {
				...coach,
				...meta,
				statusLabel: coachStatusLabels[coach.status],
				inviteUrl:
					coach.status === COACH_STATUS.invited && coach.inviteToken
						? absoluteInviteUrl(coach.inviteToken)
						: null,
			};
		});
	}
);

export const getTeamCoach = query(z.object({ teamId: idField }), async ({ teamId }) => {
	const coach = await db.query.coach.findFirst({
		where: {
			teamId,
			status: { in: [COACH_STATUS.invited, COACH_STATUS.active] },
		},
		orderBy: { createdAt: 'desc' },
	});

	if (!coach) return null;

	return {
		...coach,
		inviteUrl:
			coach.status === COACH_STATUS.invited && coach.inviteToken
				? absoluteInviteUrl(coach.inviteToken)
				: null,
	};
});

export const inviteCoach = form(inviteCoachSchema, async (data, issue) => {
	await requireOrganizerOrAdmin();
	const user = await requireUser();

	const orgId = await getLeagueOrgIdForTeam(data.teamId);
	if (!orgId) {
		return invalid(issue.teamId('Team not found.'));
	}

	const existing = await db.query.coach.findFirst({
		where: {
			teamId: data.teamId,
			status: { in: [COACH_STATUS.invited, COACH_STATUS.active] },
		},
	});

	if (existing?.status === COACH_STATUS.active) {
		return invalid(issue.teamId('This team already has an active coach. Remove them first.'));
	}

	const email = data.email.trim().toLowerCase();
	const inviteToken = crypto.randomUUID();
	const now = new Date();
	const expiresAt = new Date(now.getTime() + INVITE_DAYS * 24 * 60 * 60 * 1000);
	const name = data.name?.trim() || email.split('@')[0] || 'Coach';

	try {
		if (existing?.status === COACH_STATUS.invited) {
			const [updated] = await db
				.update(table.coach)
				.set({
					email,
					name,
					assignmentRole: data.assignmentRole,
					inviteToken,
					invitedAt: now,
					expiresAt,
					userId: null,
					acceptedAt: null,
				})
				.where(eq(table.coach.id, existing.id))
				.returning();

			serverLogger.info('re-invited coach', { id: updated.id, teamId: data.teamId, by: user.id });

			return {
				id: updated.id,
				inviteUrl: absoluteInviteUrl(inviteToken),
			};
		}

		const [created] = await db
			.insert(table.coach)
			.values({
				name,
				email,
				teamId: data.teamId,
				assignmentRole: data.assignmentRole,
				status: COACH_STATUS.invited,
				inviteToken,
				invitedAt: now,
				expiresAt,
			})
			.returning();

		serverLogger.info('invited coach', { id: created.id, teamId: data.teamId, by: user.id });

		return {
			id: created.id,
			inviteUrl: absoluteInviteUrl(inviteToken),
		};
	} catch (err) {
		serverLogger.error(err);
		return invalid('Something went wrong.');
	}
});

export const resendCoachInvite = form(idOnlySchema, async ({ id }) => {
	await requireOrganizerOrAdmin();

	const coach = await db.query.coach.findFirst({ where: { id } });
	if (!coach || coach.status !== COACH_STATUS.invited) {
		return invalid('Invitation not found or no longer pending.');
	}

	const inviteToken = crypto.randomUUID();
	const now = new Date();
	const expiresAt = new Date(now.getTime() + INVITE_DAYS * 24 * 60 * 60 * 1000);

	await db
		.update(table.coach)
		.set({ inviteToken, invitedAt: now, expiresAt, status: COACH_STATUS.invited })
		.where(eq(table.coach.id, id));

	return {
		id,
		inviteUrl: absoluteInviteUrl(inviteToken),
	};
});

export const cancelCoachInvite = form(idOnlySchema, async ({ id }) => {
	await requireOrganizerOrAdmin();

	const [updated] = await db
		.update(table.coach)
		.set({
			status: COACH_STATUS.removed,
			inviteToken: null,
			expiresAt: null,
		})
		.where(and(eq(table.coach.id, id), eq(table.coach.status, COACH_STATUS.invited)))
		.returning({ id: table.coach.id });

	if (!updated) {
		return invalid('Invitation not found.');
	}

	return { success: true };
});

export const removeCoachAccess = form(idOnlySchema, async ({ id }) => {
	await requireOrganizerOrAdmin();

	const [updated] = await db
		.update(table.coach)
		.set({
			status: COACH_STATUS.removed,
			inviteToken: null,
		})
		.where(
			and(
				eq(table.coach.id, id),
				inArray(table.coach.status, [COACH_STATUS.active, COACH_STATUS.invited])
			)
		)
		.returning({ id: table.coach.id });

	if (!updated) {
		return invalid('Coach assignment not found.');
	}

	return { success: true };
});

export const changeCoachTeam = form(changeCoachTeamSchema, async ({ id, teamId }, issue) => {
	await requireOrganizerOrAdmin();

	const coach = await db.query.coach.findFirst({ where: { id } });
	if (!coach || coach.status !== COACH_STATUS.active) {
		return invalid('Active coach assignment not found.');
	}

	const conflict = await db.query.coach.findFirst({
		where: {
			teamId,
			status: { in: [COACH_STATUS.active, COACH_STATUS.invited] },
		},
	});

	if (conflict && conflict.id !== id) {
		return invalid(issue.teamId('That team already has a coach assigned.'));
	}

	await db.update(table.coach).set({ teamId }).where(eq(table.coach.id, id));
	return { success: true };
});

export const getCoachInviteByToken = query(z.object({ token: z.uuid() }), async ({ token }) => {
	const coach = await db.query.coach.findFirst({
		where: { inviteToken: token },
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

	if (!coach) {
		notFound({ resource: 'coach' }, { message: 'Invitation not found' });
	}

	const expired =
		coach.status === COACH_STATUS.expired ||
		(coach.expiresAt != null && coach.expiresAt.getTime() < Date.now());

	if (coach.status === COACH_STATUS.removed || expired) {
		if (coach.status === COACH_STATUS.invited && expired) {
			await db
				.update(table.coach)
				.set({ status: COACH_STATUS.expired })
				.where(eq(table.coach.id, coach.id));
		}
		return {
			valid: false as const,
			reason: 'expired' as const,
			teamName: coach.team?.name ?? 'Team',
			leagueName: coach.team?.division?.season?.organization?.name ?? 'League',
		};
	}

	if (coach.status === COACH_STATUS.active) {
		return {
			valid: false as const,
			reason: 'accepted' as const,
			teamName: coach.team?.name ?? 'Team',
			leagueName: coach.team?.division?.season?.organization?.name ?? 'League',
			teamId: coach.teamId,
			orgSlug: coach.team?.division?.season?.organization?.slug ?? null,
		};
	}

	if (coach.status !== COACH_STATUS.invited) {
		return {
			valid: false as const,
			reason: 'invalid' as const,
			teamName: coach.team?.name ?? 'Team',
			leagueName: coach.team?.division?.season?.organization?.name ?? 'League',
		};
	}

	return {
		valid: true as const,
		id: coach.id,
		email: coach.email,
		name: coach.name,
		assignmentRole: coach.assignmentRole,
		teamId: coach.teamId,
		teamName: coach.team?.name ?? 'Team',
		leagueName: coach.team?.division?.season?.organization?.name ?? 'League',
		orgSlug: coach.team?.division?.season?.organization?.slug ?? null,
		organizationId: coach.team?.division?.season?.organizationId ?? null,
	};
});

export const acceptCoachInvite = form(
	z.object({ token: z.uuid() }),
	async ({ token }) => {
		const user = await requireUser();
		const invite = await getCoachInviteByToken({ token });

		if (!invite.valid) {
			return invalid('This invitation is no longer valid.');
		}

		if (invite.email && user.email.toLowerCase() !== invite.email.toLowerCase()) {
			return invalid(
				`Sign in with ${invite.email} to accept this invitation (you are signed in as ${user.email}).`
			);
		}

		if (!invite.organizationId || !invite.orgSlug) {
			return invalid('Invitation is missing league information.');
		}

		const {
			request: { headers },
		} = getRequestEvent();

		try {
			const existingMember = await db.query.member.findFirst({
				where: { organizationId: invite.organizationId, userId: user.id },
			});

			if (!existingMember) {
				await db.insert(table.member).values({
					organizationId: invite.organizationId,
					userId: user.id,
					role: 'member',
				});
			}

			await auth.api.setActiveOrganization({
				headers,
				body: { organizationId: invite.organizationId },
			});

			await db
				.update(table.coach)
				.set({
					userId: user.id,
					name: user.name || invite.name,
					status: COACH_STATUS.active,
					acceptedAt: new Date(),
					inviteToken: null,
				})
				.where(eq(table.coach.id, invite.id));

			await db
				.update(table.userOnboarding)
				.set({
					status: 'complete',
					currentStep: ONBOARDING_DONE_STEP,
					role: 'coach',
				})
				.where(eq(table.userOnboarding.userId, user.id));

			serverLogger.info('coach accepted invite', {
				coachId: invite.id,
				userId: user.id,
				teamId: invite.teamId,
			});

			redirect(
				303,
				resolve('/dashboard/[orgSlug]/portal/[teamId]', {
					orgSlug: invite.orgSlug,
					teamId: invite.teamId,
				})
			);
		} catch (err) {
			if (isRedirect(err)) throw err;
			serverLogger.error(err);
			return invalid('Something went wrong accepting the invitation.');
		}
	}
);

/** Portal landing helper: where a coach-only user should go. */
export const resolveCoachLanding = query(async () => {
	if ((await isUserAdmin()) || (await isUserLeagueOrganizer())) {
		return { kind: 'admin' as const };
	}

	const user = await getUser();
	if (!user) {
		return { kind: 'none' as const };
	}

	const assignments = await getActiveCoachAssignments(user.id);

	if (assignments.length === 0) {
		return { kind: 'none' as const };
	}

	const withOrg: Array<{
		teamId: string;
		teamName: string;
		orgSlug: string;
		orgName: string | undefined;
		seasonName: string | undefined;
		assignmentRole: (typeof assignments)[number]['assignmentRole'];
	}> = [];

	for (const a of assignments) {
		const season = a.team?.division?.season;
		let orgSlug = season?.organization?.slug;
		let orgName = season?.organization?.name;

		if (!orgSlug && season?.organizationId) {
			const org = await db.query.organization.findFirst({
				where: { id: season.organizationId },
				columns: { slug: true, name: true },
			});
			orgSlug = org?.slug;
			orgName = org?.name;
		}

		if (!orgSlug) continue;

		withOrg.push({
			teamId: a.teamId,
			teamName: a.team?.name ?? 'Team',
			orgSlug,
			orgName,
			seasonName: season?.name,
			assignmentRole: a.assignmentRole,
		});
	}

	if (withOrg.length === 0) {
		return { kind: 'none' as const };
	}

	if (withOrg.length === 1) {
		return {
			kind: 'single' as const,
			orgSlug: withOrg[0].orgSlug,
			teamId: withOrg[0].teamId,
		};
	}

	return { kind: 'multi' as const, teams: withOrg };
});
