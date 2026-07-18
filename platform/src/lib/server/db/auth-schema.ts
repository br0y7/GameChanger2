import { text, index, uniqueIndex, boolean, timestamp, uuid, snakeCase } from 'drizzle-orm/pg-core';
import { baseFields, creationFields } from './base-schema';

export const user = snakeCase.table('user', {
	...baseFields,
	name: text().notNull(),
	email: text().notNull().unique(),
	emailVerified: boolean().default(false).notNull(),
	image: text(),
	role: text(),
	banned: boolean().default(false),
	banReason: text(),
	banExpires: timestamp(),
});

export const session = snakeCase.table(
	'session',
	{
		...baseFields,
		expiresAt: timestamp().notNull(),
		token: text().notNull().unique(),
		ipAddress: text(),
		userAgent: text(),
		userId: uuid()
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		activeOrganizationId: text(),
		impersonatedBy: text(),
	},
	(table) => [index('session_userId_idx').on(table.userId)]
);

export const account = snakeCase.table(
	'account',
	{
		...baseFields,
		accountId: text().notNull(),
		providerId: text().notNull(),
		userId: uuid()
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		accessToken: text(),
		refreshToken: text(),
		idToken: text(),
		accessTokenExpiresAt: timestamp(),
		refreshTokenExpiresAt: timestamp(),
		scope: text(),
		password: text(),
	},
	(table) => [index('account_userId_idx').on(table.userId)]
);

export const verification = snakeCase.table(
	'verification',
	{
		...baseFields,
		identifier: text().notNull(),
		value: text().notNull(),
		expiresAt: timestamp().notNull(),
	},
	(table) => [index('verification_identifier_idx').on(table.identifier)]
);

export const organization = snakeCase.table(
	'organization',
	{
		...creationFields,
		name: text().notNull(),
		slug: text().notNull().unique(),
		logo: text(),
		metadata: text(),
		type: text({ enum: ['team', 'league', 'system'] })
			.notNull()
			.default('league'),
	},
	(table) => [uniqueIndex('organization_slug_uidx').on(table.slug)]
);

export type Organization = typeof organization.$inferSelect;

export const member = snakeCase.table(
	'member',
	{
		...creationFields,
		organizationId: uuid()
			.notNull()
			.references(() => organization.id, { onDelete: 'cascade' }),
		userId: uuid()
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		role: text().default('member').notNull(),
	},
	(table) => [
		index('member_organizationId_idx').on(table.organizationId),
		index('member_userId_idx').on(table.userId),
	]
);

export const invitation = snakeCase.table(
	'invitation',
	{
		...creationFields,
		organizationId: uuid()
			.notNull()
			.references(() => organization.id, { onDelete: 'cascade' }),
		email: text().notNull(),
		role: text(),
		status: text().default('pending').notNull(),
		expiresAt: timestamp().notNull(),
		inviterId: uuid()
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
	},
	(table) => [
		index('invitation_organizationId_idx').on(table.organizationId),
		index('invitation_email_idx').on(table.email),
	]
);
