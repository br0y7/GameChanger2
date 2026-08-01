import { sql } from 'drizzle-orm';
import { uuid, timestamp, text } from 'drizzle-orm/pg-core';

export const creationFields = {
	id: uuid('id')
		.primaryKey()
		.default(sql`uuidv7()`),
	createdAt: timestamp('created_at').defaultNow().notNull(),
};

export const baseFields = {
	...creationFields,
	updatedAt: timestamp('updated_at')
		.$onUpdateFn(() => new Date())
		.notNull(),
};

export const nameSlugFields = {
	name: text().notNull(),
	slug: text().notNull(),
};
