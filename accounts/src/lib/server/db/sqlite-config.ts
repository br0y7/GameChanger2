import { Database } from 'bun:sqlite';

/**
 * Optimize SQLite db, enable WAL mode
 * @param client SQLite Database
 */
export function optimizeSQLite(client: Database) {
	client.run('PRAGMA journal_mode = WAL;');
	client.run('PRAGMA synchronous = NORMAL;');
}
