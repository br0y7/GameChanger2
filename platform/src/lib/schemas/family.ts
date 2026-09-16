import { z } from 'zod';
import { idField } from './common';

export const familyAccessStatuses = ['invited', 'active', 'expired', 'removed'] as const;
export type FamilyAccessStatus = (typeof familyAccessStatuses)[number];

export const FAMILY_ACCESS_STATUS = {
	invited: 'invited',
	active: 'active',
	expired: 'expired',
	removed: 'removed',
} as const satisfies Record<FamilyAccessStatus, FamilyAccessStatus>;

export const familyRelationships = ['parent', 'guardian', 'relative', 'fan', 'other'] as const;

export const inviteFamilySchema = z.object({
	playerId: idField,
	email: z.email(),
	relationship: z.enum(familyRelationships).default('parent'),
	name: z.string().trim().max(100).optional(),
});

export type InviteFamilySchema = z.infer<typeof inviteFamilySchema>;
