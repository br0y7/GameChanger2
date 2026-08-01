import { drizzle } from 'drizzle-orm/bun-sql';
import { env } from '$env/dynamic/private';
import { authRelations } from './auth-relations';
import { relations } from './relations';
import { SQL } from 'bun';

if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

const client = new SQL(env.DATABASE_URL);

export const db = drizzle({ client, relations: { ...authRelations, ...relations } });
