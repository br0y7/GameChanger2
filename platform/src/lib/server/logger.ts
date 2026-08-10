import type { Logger } from '$lib/logger/types';

// simple logger for now, writes to stdout (console)
/**
 * The logger for the `platform` server.
 */
export const serverLogger: Logger = {
	info: (...args: unknown[]) => console.info(new Date().toISOString(), 'INFO', ...args),
	warn: (...args: unknown[]) => console.warn(new Date().toISOString(), 'WARN', ...args),
	error: (...args: unknown[]) => console.error(new Date().toISOString(), 'ERROR', ...args),
};
