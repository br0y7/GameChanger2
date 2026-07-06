import type { Logger } from '$lib/logger/types';

// simple logger for now, writes to stdout (console)
/**
 * The logger for the `platform` server.
 */
export const serverLogger: Logger = {
	info: (...args: unknown[]) => console.log(...args),
	warn: (...args: unknown[]) => console.warn(...args),
	error: (...args: unknown[]) => console.error(...args),
};
