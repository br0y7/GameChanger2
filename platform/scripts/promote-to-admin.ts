import { db } from '$lib/server/db';
import { user } from '$lib/server/db/auth-schema';
import { eq } from 'drizzle-orm';
import { parseArgs } from 'util';

const { values } = parseArgs({
	args: Bun.argv,
	options: {
		email: {
			type: 'string',
		},
		help: {
			type: 'boolean',
		},
		h: {
			type: 'boolean',
		},
	},
	strict: true,
	allowPositionals: true,
});

if (values.help || values.h) {
	console.log('This script is used to promote a user to an admin.');
	console.log('How to use: bun run admin:promote --email user@email.com');
	process.exit(0);
}

const ERROR_PREFIX = '[ERROR]';

const USER_EMAIL = values.email?.trim();

if (!USER_EMAIL) {
	console.error(`${ERROR_PREFIX} No email provided. Tip: --email user@email.com`);
	process.exit(1);
}

const emailRegex = /^[\w\-.]+@([\w-]+\.)+[\w-]{2,}$/;
if (!emailRegex.test(USER_EMAIL)) {
	console.error(`${ERROR_PREFIX} Invalid email: ${USER_EMAIL}`);
	process.exit(1);
}

try {
	const result = await db
		.update(user)
		.set({ role: 'admin' })
		.where(eq(user.email, USER_EMAIL))
		.returning({ name: user.name });

	if (result.length <= 0) {
		console.error(`${ERROR_PREFIX} ${USER_EMAIL} does not exist.`);
		process.exit(1);
	}

	console.log(`[INFO] ✅ ${USER_EMAIL} ${result[0].name} is now an admin.`);
} catch (error) {
	console.error(`${ERROR_PREFIX} admin promotion failed.`, error);
	process.exit(1);
}
