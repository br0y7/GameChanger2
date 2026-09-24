import { form, getRequestEvent, query } from '$app/server';
import {
	clearLeagueLogoSchema,
	createLeagueSchema,
	updateLeagueSchema,
	uploadLeagueLogoSchema,
} from '$lib/schemas/league';
import { auth } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { isUserAdmin, requireAdmin, requireSession, requireUser } from './auth.remote';
import { eq } from 'drizzle-orm';
import { serverLogger } from '$lib/server/logger';
import { advanceOnboardingStep } from './onboarding.server';
import { getOnboarding } from './onboarding.remote';
import { isAPIError } from 'better-auth/api';
import { invalid, isRedirect, redirect } from '@sveltejs/kit';
import { NEXT_ORGANIZER_ONBOARDING_STEP } from '$lib/onboarding/steps';
import * as table from '$lib/server/db/schema';
import { leagueFormLabels } from '$lib/forms/labels';
import { isUserOrgAdmin, listAllLeaguesForAdmin, getHomepageLeague } from './organization.remote';
import { forbidden } from '$lib/server/fail';
import { resolve } from '$app/paths';
import { mkdir, unlink } from 'node:fs/promises';
import path from 'node:path';
import { idOnlySchema } from '$lib/schemas/common';

const LOGO_EXT: Record<string, string> = {
	'image/png': 'png',
	'image/webp': 'webp',
	'image/jpeg': 'jpg',
};

async function removeStoredLogoFile(logoUrl: string | null | undefined) {
	if (!logoUrl?.startsWith('/uploads/logos/')) return;
	const filePath = path.join(process.cwd(), 'static', logoUrl.replace(/^\//, ''));
	try {
		await unlink(filePath);
	} catch {
		// ignore missing file
	}
}

export const createLeague = form(createLeagueSchema, async (data, issue) => {
	const user = await requireUser();

	const {
		request: { headers },
	} = getRequestEvent();
	try {
		const league = await auth.api.createOrganization({
			headers,
			body: data,
		});

		await db
			.update(table.organization)
			.set({ type: 'league' })
			.where(eq(table.organization.id, league.id));

		await db
			.insert(table.leagueVisibility)
			.values({ organizationId: league.id })
			.onConflictDoNothing();

		await auth.api.setActiveOrganization({
			headers,
			body: { organizationId: league.id },
		});

		serverLogger.info(user.id, 'created league', league.id);

		if (await isUserAdmin()) {
			redirect(303, resolve('/dashboard/[orgSlug]', { orgSlug: league.slug }));
		} else {
			const onboarding = await getOnboarding({ userId: user.id });
			await advanceOnboardingStep(onboarding, NEXT_ORGANIZER_ONBOARDING_STEP);
		}
	} catch (err) {
		if (isRedirect(err)) {
			serverLogger.info('redirect', err.location);
			throw err;
		}

		if (isAPIError(err) && err.body) {
			serverLogger.error(err, err.body);

			const { $ERROR_CODES } = auth;

			switch (err.body.code) {
				case $ERROR_CODES.ORGANIZATION_ALREADY_EXISTS.code:
				case $ERROR_CODES.ORGANIZATION_SLUG_ALREADY_TAKEN.code:
					return invalid(issue.slug(`${leagueFormLabels.slug} already taken.`));
				case $ERROR_CODES.YOU_ARE_NOT_ALLOWED_TO_CREATE_A_NEW_ORGANIZATION.code:
				case $ERROR_CODES.YOU_HAVE_REACHED_THE_MAXIMUM_NUMBER_OF_ORGANIZATIONS.code:
					return invalid(`You are not allowed to make a league.`);
			}
		}

		serverLogger.error(err);

		return invalid('Something went wrong.');
	}
});

export const isUserLeagueOrganizer = query(async () => {
	if (!(await isUserOrgAdmin())) {
		return false;
	}

	const { activeOrganizationId } = await requireSession();

	if (!activeOrganizationId) {
		return false;
	}

	const organization = await db.query.organization.findFirst({
		where: { id: activeOrganizationId },
		columns: { type: true },
	});

	return organization?.type === 'league';
});

export const requireLeagueOrganizer = query(async () => {
	if (!(await isUserLeagueOrganizer())) {
		forbidden({ resource: 'user' });
	}
});

export const updateLeague = form(updateLeagueSchema, async ({ id, ...data }, issue) => {
	await requireLeagueOrganizer();

	const {
		request: { headers },
	} = getRequestEvent();
	try {
		const updated = await auth.api.updateOrganization({
			body: {
				data,
				organizationId: id,
			},
			headers,
		});

		const user = await requireUser();
		serverLogger.info(user.id, 'updated league', id);

		return updated;
	} catch (err) {
		if (isAPIError(err) && err.body) {
			serverLogger.error(err, err.body);

			const { $ERROR_CODES } = auth;

			switch (err.body.code) {
				case $ERROR_CODES.ORGANIZATION_ALREADY_EXISTS.code:
				case $ERROR_CODES.ORGANIZATION_SLUG_ALREADY_TAKEN.code:
					return invalid(issue.slug(`${leagueFormLabels.slug} already taken.`));
			}
		}

		serverLogger.error(err);

		return invalid('Something went wrong.');
	}
});

/** League / platform admin only — homepage hero logo (PNG / WebP preferred). */
export const uploadLeagueLogo = form(uploadLeagueLogoSchema, async ({ organizationId, logo }) => {
	const user = await requireUser();
	const isPlatformAdmin = await isUserAdmin();
	if (!isPlatformAdmin) {
		await requireLeagueOrganizer();
		const { activeOrganizationId } = await requireSession();
		if (activeOrganizationId !== organizationId) {
			forbidden({ resource: 'organization' });
		}
	}

	const org = await db.query.organization.findFirst({
		where: { id: organizationId },
		columns: { id: true, logo: true, type: true },
	});
	if (!org || org.type !== 'league') {
		return invalid('League not found.');
	}

	const ext = LOGO_EXT[logo.type];
	if (!ext) {
		return invalid('Upload a PNG, WebP, or JPEG logo.');
	}

	const uploadsDir = path.join(process.cwd(), 'static', 'uploads', 'logos');
	await mkdir(uploadsDir, { recursive: true });

	const publicPath = `/uploads/logos/${organizationId}.${ext}`;
	const filePath = path.join(process.cwd(), 'static', publicPath.replace(/^\//, ''));

	await removeStoredLogoFile(org.logo);
	// Clear other extensions for this org so only one logo file remains
	for (const other of Object.values(LOGO_EXT)) {
		if (other === ext) continue;
		await removeStoredLogoFile(`/uploads/logos/${organizationId}.${other}`);
	}

	await Bun.write(filePath, Buffer.from(await logo.arrayBuffer()));

	const cacheBusted = `${publicPath}?v=${Date.now()}`;
	await db.update(table.organization).set({ logo: cacheBusted }).where(eq(table.organization.id, organizationId));

	serverLogger.info(user.id, 'uploaded league logo', organizationId);
	return { logo: cacheBusted };
});

export const clearLeagueLogo = form(clearLeagueLogoSchema, async ({ organizationId }) => {
	const user = await requireUser();
	const isPlatformAdmin = await isUserAdmin();
	if (!isPlatformAdmin) {
		await requireLeagueOrganizer();
		const { activeOrganizationId } = await requireSession();
		if (activeOrganizationId !== organizationId) {
			forbidden({ resource: 'organization' });
		}
	}

	const org = await db.query.organization.findFirst({
		where: { id: organizationId },
		columns: { id: true, logo: true, type: true },
	});
	if (!org || org.type !== 'league') {
		return invalid('League not found.');
	}

	await removeStoredLogoFile(org.logo);
	for (const ext of Object.values(LOGO_EXT)) {
		await removeStoredLogoFile(`/uploads/logos/${organizationId}.${ext}`);
	}

	await db.update(table.organization).set({ logo: null }).where(eq(table.organization.id, organizationId));
	serverLogger.info(user.id, 'cleared league logo', organizationId);
	return { logo: null };
});

/** Platform admin only — permanently deletes a league and cascaded seasons/teams/games. */
export const deleteLeague = form(idOnlySchema, async ({ id }) => {
	const user = await requireAdmin();

	const league = await db.query.organization.findFirst({
		where: { id },
		columns: { id: true, name: true, slug: true, type: true, logo: true },
	});

	if (!league || league.type !== 'league') {
		return invalid('League not found.');
	}

	const session = await requireSession();
	const {
		request: { headers },
	} = getRequestEvent();

	await removeStoredLogoFile(league.logo);
	for (const ext of Object.values(LOGO_EXT)) {
		await removeStoredLogoFile(`/uploads/logos/${league.id}.${ext}`);
	}

	try {
		await db.delete(table.organization).where(eq(table.organization.id, league.id));
	} catch (err) {
		serverLogger.error(err);
		return invalid('Could not delete this league. Try again.');
	}

	if (session.activeOrganizationId === league.id) {
		const adminOrg = await db.query.organization.findFirst({
			where: { type: 'system' },
			columns: { id: true },
		});
		if (adminOrg) {
			await auth.api.setActiveOrganization({
				headers,
				body: { organizationId: adminOrg.id },
			});
			void requireSession().refresh();
		}
	}

	serverLogger.info(user.id, 'deleted league', { id: league.id, slug: league.slug });

	void listAllLeaguesForAdmin().refresh();
	void getHomepageLeague().refresh();

	return { id: league.id, name: league.name };
});
