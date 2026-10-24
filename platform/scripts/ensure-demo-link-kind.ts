/**
 * Adds the demo link view "all" outside Drizzle's migration transaction.
 * Postgres cannot add an enum value and use it in the same transaction, and
 * `bun run db:migrate` applies every pending file in one transaction.
 * Run this once after migrate. Later starts see the value and leave existing
 * organizer links alone.
 */
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
	console.error('DATABASE_URL is not set');
	process.exit(1);
}

const sql = new Bun.SQL(databaseUrl);

try {
	const existing = await sql`
		SELECT 1
		FROM pg_enum e
		JOIN pg_type t ON t.oid = e.enumtypid
		WHERE t.typname = 'demo_link_kind' AND e.enumlabel = 'all'
	`;

	if (existing.length === 0) {
		await sql`ALTER TYPE "demo_link_kind" ADD VALUE IF NOT EXISTS 'all'`;
		await sql`UPDATE "demo_link" SET "kind" = 'all' WHERE "kind" = 'league'`;
		console.log('Demo links can use the combined view.');
	}
} finally {
	await sql.close();
}
