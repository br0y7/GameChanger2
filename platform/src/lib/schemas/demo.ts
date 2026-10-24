import { z } from 'zod';
import { idField } from './common';

export const demoLinkKinds = ['all', 'family', 'coach', 'league'] as const;
export type DemoLinkKind = (typeof demoLinkKinds)[number];

export const DEMO_LINK_KIND = {
	all: 'all',
	family: 'family',
	coach: 'coach',
	league: 'league',
} as const satisfies Record<DemoLinkKind, DemoLinkKind>;

export const demoLinkKindLabels: Record<DemoLinkKind, string> = {
	all: 'Player, coach, and stats',
	family: 'Only player dashboard',
	coach: 'Coach dashboards',
	league: 'League organizer',
};

export function demoViewDescription(kind: DemoLinkKind) {
	switch (kind) {
		case 'family':
			return 'This link can only open the player dashboard';
		case 'coach':
			return 'View-only coach dashboards';
		case 'league':
			return 'View-only league organizer dashboard';
		default:
			return 'View-only preview of player dashboards, coach dashboards, and stats';
	}
}

export const demoExpiryDays = [7, 14, 30, 90] as const;
export type DemoExpiryDays = (typeof demoExpiryDays)[number];

export const createDemoLinkSchema = z.object({
	organizationId: idField,
	kind: z.enum(demoLinkKinds).default('all'),
	expiresInDays: z.coerce
		.number()
		.refine((days): days is DemoExpiryDays => (demoExpiryDays as readonly number[]).includes(days), {
			message: 'Pick 7, 14, 30, or 90 days.',
		}),
});

export const updateDemoLinkViewSchema = z.object({
	id: idField,
	kind: z.enum(demoLinkKinds),
});

export type CreateDemoLinkSchema = z.infer<typeof createDemoLinkSchema>;
