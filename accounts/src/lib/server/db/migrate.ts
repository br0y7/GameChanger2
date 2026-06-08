import { migrate } from 'drizzle-orm/bun-sqlite/migrator';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { Database } from 'bun:sqlite';
import { optimizeSQLite } from './sqlite-config';

try {
	if (!Bun.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');
	const DATABASE_URL = Bun.env.DATABASE_URL;

	console.log(`location: ${DATABASE_URL}`);

	const client = new Database(DATABASE_URL);

	optimizeSQLite(client);

	const db = drizzle({ client });
	migrate(db, { migrationsFolder: './drizzle' });

	client.close();
	console.log('migration success');
} catch (error) {
	console.error(error);
	process.exit(1);
}
