import { FAMILY_ACCESS_STATUS } from '$lib/schemas/family';
import { db } from '$lib/server/db';
import { forbidden } from '$lib/server/fail';
import { isUserAdmin, requireUser } from '$lib/api/auth.remote';
import { isUserLeagueOrganizer } from '$lib/api/league.remote';

export async function getActiveFamilyLinks(userId: string) {
	return db.query.playerFollower.findMany({
		where: {
			userId,
			status: FAMILY_ACCESS_STATUS.active,
		},
		with: {
			player: {
				with: {
					team: {
						with: {
							division: {
								with: {
									season: {
										with: { organization: true },
									},
								},
							},
						},
					},
				},
			},
		},
	});
}

export async function getFamilyLinkForPlayer(userId: string, playerId: string) {
	return db.query.playerFollower.findFirst({
		where: {
			userId,
			playerId,
			status: FAMILY_ACCESS_STATUS.active,
		},
	});
}

/** Player account claim OR active family follower. */
export async function canAccessFamilyPlayer(playerId: string): Promise<boolean> {
	if ((await isUserAdmin()) || (await isUserLeagueOrganizer())) {
		return true;
	}
	const user = await requireUser();
	const asPlayer = await db.query.player.findFirst({
		where: { id: playerId, userId: user.id },
		columns: { id: true },
	});
	if (asPlayer) return true;
	const link = await getFamilyLinkForPlayer(user.id, playerId);
	return !!link;
}

export async function requireFamilyPlayerAccess(playerId: string) {
	if (!(await canAccessFamilyPlayer(playerId))) {
		forbidden({ resource: 'player' }, { message: 'Private player access only.' });
	}
}

export async function isFamilyOnlyUser(userId?: string): Promise<boolean> {
	if ((await isUserAdmin()) || (await isUserLeagueOrganizer())) {
		return false;
	}
	const id = userId ?? (await requireUser()).id;
	const coach = await db.query.coach.findFirst({
		where: { userId: id, status: 'active' },
		columns: { id: true },
	});
	if (coach) return false;
	const links = await getActiveFamilyLinks(id);
	const claimed = await db.query.player.findFirst({
		where: { userId: id },
		columns: { id: true },
	});
	return links.length > 0 || !!claimed;
}
