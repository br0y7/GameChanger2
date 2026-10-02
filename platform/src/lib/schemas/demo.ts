import { z } from 'zod';
import { idField } from './common';

export const demoLinkKinds = ['family', 'coach', 'league'] as const;
export type DemoLinkKind = (typeof demoLinkKinds)[number];

export const DEMO_LINK_KIND = {
	family: 'family',
	coach: 'coach',
	league: 'league',
} as const satisfies Record<DemoLinkKind, DemoLinkKind>;

export const demoLinkKindLabels: Record<DemoLinkKind, string> = {
	family: 'Player dashboard',
	coach: 'Coach dashboard',
	league: 'League organizer',
};

export const demoExpiryDays = [7, 14, 30, 90] as const;
export type DemoExpiryDays = (typeof demoExpiryDays)[number];

export const createDemoLinkSchema = z.object({
	organizationId: idField,
	expiresInDays: z.coerce
		.number()
		.refine((days): days is DemoExpiryDays => (demoExpiryDays as readonly number[]).includes(days), {
			message: 'Pick 7, 14, 30, or 90 days.',
		}),
});

export type CreateDemoLinkSchema = z.infer<typeof createDemoLinkSchema>;
