import { drizzle } from 'drizzle-orm/bun-sqlite';
import { Database } from 'bun:sqlite';
import { env } from '$env/dynamic/private';
import { authRelations } from './auth-relations';
import { optimizeSQLite } from './sqlite-config';
import { relations } from './relations';

if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

const client = new Database(env.DATABASE_URL);

optimizeSQLite(client);

export const db = drizzle({ client, relations: { ...authRelations, ...relations } });
