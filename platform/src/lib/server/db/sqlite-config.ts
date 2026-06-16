import { Database } from 'bun:sqlite';

/**
 * Enable WAL for performance and to prevent locked db errors
 * @param client SQLite Database
 */
export function optimizeSQLite(client: Database) {
	client.run('PRAGMA journal_mode = WAL;');
	client.run('PRAGMA synchronous = NORMAL;');
}
