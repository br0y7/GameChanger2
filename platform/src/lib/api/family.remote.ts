import { form, getRequestEvent, query } from '$app/server';
import { resolve } from '$app/paths';
import { idField, idOnlySchema } from '$lib/schemas/common';
import { FAMILY_ACCESS_STATUS, inviteFamilySchema } from '$lib/schemas/family';
import { auth } from '$lib/server/auth';
import {
	getActiveFamilyLinks,
	requireFamilyPlayerAccess,
} from '$lib/server/family-access.server';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { forbidden, notFound } from '$lib/server/fail';
import { serverLogger } from '$lib/server/logger';
import { ONBOARDING_DONE_STEP } from '$lib/onboarding/steps';
import { derivePlayerGameStats } from '$lib/stats/player-game-stats';
import { derivePlayerStats } from '$lib/stats/player-stats';
import { derivePlayerStrengths } from '$lib/player-analysis/player-strengths';
import { derivePlayerWeaknesses } from '$lib/player-analysis/player-weaknesses';
import { invalid, isRedirect, redirect } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { isUserAdmin, requireUser } from './auth.remote';
import { isUserLeagueOrganizer } from './league.remote';

const INVITE_DAYS = 14;

function absoluteInviteUrl(token: string) {
	const { url } = getRequestEvent();
	return new URL(`/invite/family/${token}`, url.origin).toString();
}

async function requireOrganizerOrAdmin() {
	if ((await isUserAdmin()) || (await isUserLeagueOrganizer())) return;
	forbidden({ resource: 'player' });
}

export const getMyFamilyPlayers = query(async () => {
	const user = await requireUser();
	const links = await getActiveFamilyLinks(user.id);
	const claimed = await db.query.player.findMany({
		where: { userId: user.id },
		with: {
			team: {
				with: {
					division: {
						with: {
							season: { with: { organization: true } },
						},
					},
				},
			},
		},
	});

	const fromLinks = links
		.filter((l) => l.player)
		.map((l) => ({
			playerId: l.playerId,
			name: l.player!.name,
			jerseyNumber: l.player!.jerseyNumber,
			teamName: l.player!.team?.name ?? 'Team',
			divisionName: l.player!.team?.division?.name ?? '',
			seasonName: l.player!.team?.division?.season?.name ?? '',
			orgSlug: l.player!.team?.division?.season?.organization?.slug ?? null,
			orgName: l.player!.team?.division?.season?.organization?.name ?? null,
			relationship: l.relationship,
		}));

	const fromClaimed = claimed.map((p) => ({
		playerId: p.id,
		name: p.name,
		jerseyNumber: p.jerseyNumber,
		teamName: p.team?.name ?? 'Team',
		divisionName: p.team?.division?.name ?? '',
		seasonName: p.team?.division?.season?.name ?? '',
		orgSlug: p.team?.division?.season?.organization?.slug ?? null,
		orgName: p.team?.division?.season?.organization?.name ?? null,
		relationship: 'player' as const,
	}));

	const byId = new Map<string, (typeof fromLinks)[number] | (typeof fromClaimed)[number]>();
	for (const p of [...fromClaimed, ...fromLinks]) byId.set(p.playerId, p);
	return [...byId.values()];
});

export const resolveFamilyLanding = query(async () => {
	if ((await isUserAdmin()) || (await isUserLeagueOrganizer())) {
		return { kind: 'admin' as const };
	}
	const players = await getMyFamilyPlayers();
	const withOrg = players.filter((p): p is typeof p & { orgSlug: string } => !!p.orgSlug);
	if (withOrg.length === 0) return { kind: 'none' as const };
	if (withOrg.length === 1) {
		return {
			kind: 'single' as const,
			orgSlug: withOrg[0].orgSlug,
			playerId: withOrg[0].playerId,
		};
	}
	return { kind: 'multi' as const, players: withOrg };
});

export const inviteFamily = form(inviteFamilySchema, async (data, issue) => {
	await requireOrganizerOrAdmin();
	const user = await requireUser();

	const player = await db.query.player.findFirst({
		where: { id: data.playerId },
		with: {
			team: {
				with: {
					division: { with: { season: { with: { organization: true } } } },
				},
			},
		},
	});
	if (!player) return invalid(issue.playerId('Player not found.'));

	const email = data.email.trim().toLowerCase();
	const inviteToken = crypto.randomUUID();
	const now = new Date();
	const expiresAt = new Date(now.getTime() + INVITE_DAYS * 24 * 60 * 60 * 1000);

	const existing = await db.query.playerFollower.findFirst({
		where: {
			playerId: data.playerId,
			email,
			status: { in: [FAMILY_ACCESS_STATUS.invited, FAMILY_ACCESS_STATUS.active] },
		},
	});

	try {
		if (existing?.status === FAMILY_ACCESS_STATUS.active) {
			return invalid(issue.email('This email already has access to this player.'));
		}

		if (existing?.status === FAMILY_ACCESS_STATUS.invited) {
			await db
				.update(table.playerFollower)
				.set({
					inviteToken,
					invitedAt: now,
					expiresAt,
					relationship: data.relationship,
				})
				.where(eq(table.playerFollower.id, existing.id));
		} else {
			await db.insert(table.playerFollower).values({
				playerId: data.playerId,
				email,
				relationship: data.relationship,
				status: FAMILY_ACCESS_STATUS.invited,
				inviteToken,
				invitedAt: now,
				expiresAt,
			});
		}

		serverLogger.info('invited family', { playerId: data.playerId, email, by: user.id });
		return { inviteUrl: absoluteInviteUrl(inviteToken) };
	} catch (err) {
		serverLogger.error(err);
		return invalid('Something went wrong.');
	}
});

export const getFamilyInviteByToken = query(z.object({ token: z.uuid() }), async ({ token }) => {
	const invite = await db.query.playerFollower.findFirst({
		where: { inviteToken: token },
		with: {
			player: {
				with: {
					team: {
						with: {
							division: {
								with: {
									season: { with: { organization: true } },
								},
							},
						},
					},
				},
			},
		},
	});

	if (!invite || !invite.player) {
		notFound({ resource: 'player' }, { message: 'Invitation not found' });
	}

	const expired =
		invite.status === FAMILY_ACCESS_STATUS.expired ||
		(invite.expiresAt != null && invite.expiresAt.getTime() < Date.now());

	const leagueName = invite.player.team?.division?.season?.organization?.name ?? 'League';
	const teamName = invite.player.team?.name ?? 'Team';
	const orgSlug = invite.player.team?.division?.season?.organization?.slug ?? null;
	const organizationId = invite.player.team?.division?.season?.organizationId ?? null;

	if (invite.status === FAMILY_ACCESS_STATUS.removed || expired) {
		if (invite.status === FAMILY_ACCESS_STATUS.invited && expired) {
			await db
				.update(table.playerFollower)
				.set({ status: FAMILY_ACCESS_STATUS.expired })
				.where(eq(table.playerFollower.id, invite.id));
		}
		return {
			valid: false as const,
			reason: 'expired' as const,
			playerName: invite.player.name,
			teamName,
			leagueName,
		};
	}

	if (invite.status === FAMILY_ACCESS_STATUS.active) {
		return {
			valid: false as const,
			reason: 'accepted' as const,
			playerName: invite.player.name,
			playerId: invite.playerId,
			teamName,
			leagueName,
			orgSlug,
		};
	}

	return {
		valid: true as const,
		id: invite.id,
		email: invite.email,
		playerId: invite.playerId,
		playerName: invite.player.name,
		teamName,
		leagueName,
		orgSlug,
		organizationId,
		relationship: invite.relationship,
	};
});

export const acceptFamilyInvite = form(z.object({ token: z.uuid() }), async ({ token }) => {
	const user = await requireUser();
	const invite = await getFamilyInviteByToken({ token });
	if (!invite.valid) return invalid('This invitation is no longer valid.');

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
			.update(table.playerFollower)
			.set({
				userId: user.id,
				status: FAMILY_ACCESS_STATUS.active,
				acceptedAt: new Date(),
				inviteToken: null,
			})
			.where(eq(table.playerFollower.id, invite.id));

		await db
			.update(table.userOnboarding)
			.set({
				status: 'complete',
				currentStep: ONBOARDING_DONE_STEP,
				role: 'player_follower',
			})
			.where(eq(table.userOnboarding.userId, user.id));

		serverLogger.info('family accepted invite', {
			followerId: invite.id,
			userId: user.id,
			playerId: invite.playerId,
		});

		redirect(
			303,
			resolve('/dashboard/[orgSlug]/family/[playerId]', {
				orgSlug: invite.orgSlug,
				playerId: invite.playerId,
			})
		);
	} catch (err) {
		if (isRedirect(err)) throw err;
		serverLogger.error(err);
		return invalid('Something went wrong accepting the invitation.');
	}
});

function avg(stats: { pts: number; reb: number; ast: number; stl: number }[], key: 'pts' | 'reb' | 'ast' | 'stl') {
	if (!stats.length) return 0;
	return stats.reduce((s, g) => s + g[key], 0) / stats.length;
}

export const getFamilyPlayerHome = query(
	z.object({ playerId: idField }),
	async ({ playerId }) => {
		await requireFamilyPlayerAccess(playerId);

		const player = await db.query.player.findFirst({
			where: { id: playerId },
			with: {
				team: {
					with: {
						division: {
							with: {
								season: { with: { organization: true } },
							},
						},
					},
				},
				gameStats: {
					with: {
						game: {
							with: {
								homeTeam: { columns: { id: true, name: true } },
								awayTeam: { columns: { id: true, name: true } },
							},
						},
					},
				},
			},
		});

		if (!player) notFound({ resource: 'player' });

		const derived = player.gameStats
			.filter((s) => s.game)
			.map(derivePlayerGameStats);

		// chronological oldest → newest
		const chronological = [...derived].sort((a, b) => {
			const aAt = (a.game?.completedAt ?? a.game?.scheduledAt)?.getTime() ?? 0;
			const bAt = (b.game?.completedAt ?? b.game?.scheduledAt)?.getTime() ?? 0;
			return aAt - bAt;
		});

		const gp = chronological.length;
		const season = {
			ppg: avg(chronological, 'pts'),
			rpg: avg(chronological, 'reb'),
			apg: avg(chronological, 'ast'),
			spg: avg(chronological, 'stl'),
			gp,
		};

		const split = Math.max(1, Math.floor(gp / 2));
		const early = chronological.slice(0, split);
		const late = chronological.slice(Math.max(split, gp - split));

		const progressMetric = (key: 'pts' | 'reb' | 'ast') => {
			const beginning = avg(early, key);
			const current = avg(late.length ? late : chronological, key);
			const improvementPct =
				beginning > 0.05 ? Math.round(((current - beginning) / beginning) * 100) : null;
			return { beginning, current, improvementPct };
		};

		const teamId = player.teamId;
		const recentGames = [...player.gameStats]
			.filter((s) => s.game)
			.sort((a, b) => {
				const aAt = (a.game?.completedAt ?? a.game?.scheduledAt)?.getTime() ?? 0;
				const bAt = (b.game?.completedAt ?? b.game?.scheduledAt)?.getTime() ?? 0;
				return bAt - aAt;
			})
			.slice(0, 5)
			.map((raw) => {
				const stat = derivePlayerGameStats(raw);
				const game = raw.game!;
				const isHome = game.homeTeamId === teamId;
				const opponent = isHome ? game.awayTeam : game.homeTeam;
				return {
					gameId: game.id,
					date: game.completedAt ?? game.scheduledAt,
					opponentName: opponent?.name ?? 'Opponent',
					pts: stat.pts,
					reb: stat.reb,
					ast: stat.ast,
					stl: stat.stl,
				};
			});

		const seasonId = player.team?.division?.seasonId;
		const scheduleGames = seasonId
			? await db.query.game.findMany({
					where: { seasonId },
					with: {
						homeTeam: { columns: { id: true, name: true } },
						awayTeam: { columns: { id: true, name: true } },
					},
					orderBy: { scheduledAt: 'asc' },
				})
			: [];

		const schedule = scheduleGames
			.filter((g) => g.homeTeamId === teamId || g.awayTeamId === teamId)
			.map((game) => {
				const isHome = game.homeTeamId === teamId;
				const opponent = isHome ? game.awayTeam : game.homeTeam;
				const teamScore = isHome ? (game.homeTeamScore ?? 0) : (game.awayTeamScore ?? 0);
				const oppScore = isHome ? (game.awayTeamScore ?? 0) : (game.homeTeamScore ?? 0);
				const result =
					game.status === 'completed'
						? teamScore > oppScore
							? ('W' as const)
							: teamScore < oppScore
								? ('L' as const)
								: ('T' as const)
						: null;
				return {
					id: game.id,
					status: game.status,
					scheduledAt: game.scheduledAt,
					completedAt: game.completedAt,
					opponentName: opponent?.name ?? 'TBD',
					result,
					teamScore: game.status === 'completed' ? teamScore : null,
					oppScore: game.status === 'completed' ? oppScore : null,
				};
			});

		const analysisStats = derivePlayerStats(chronological);
		const strengths = derivePlayerStrengths(analysisStats)
			.slice(0, 3)
			.map((s) => s.description);
		const focusAreas = derivePlayerWeaknesses(analysisStats)
			.slice(0, 3)
			.map((w) => w.description);

		return {
			player: {
				id: player.id,
				name: player.name,
				jerseyNumber: player.jerseyNumber,
				teamName: player.team?.name ?? 'Team',
				divisionName: player.team?.division?.name ?? '',
				seasonName: player.team?.division?.season?.name ?? '',
				leagueName: player.team?.division?.season?.organization?.name ?? '',
			},
			season,
			progress: {
				points: progressMetric('pts'),
				rebounds: progressMetric('reb'),
				assists: progressMetric('ast'),
			},
			recentGames,
			schedule,
			strengths,
			focusAreas,
			coachFeedback: null as string | null,
		};
	}
);

export const cancelFamilyInvite = form(idOnlySchema, async ({ id }) => {
	await requireOrganizerOrAdmin();
	await db
		.update(table.playerFollower)
		.set({ status: FAMILY_ACCESS_STATUS.removed, inviteToken: null })
		.where(
			and(eq(table.playerFollower.id, id), eq(table.playerFollower.status, FAMILY_ACCESS_STATUS.invited))
		);
	return { success: true };
});
