interface Logger {
	info: (...args: unknown[]) => void;
	warn: (...args: unknown[]) => void;
	error: (...args: unknown[]) => void;
}

// simple logger for now, writes to stdout (console)
/**
 * The logger for the `accounts` server.
 */
export const logger: Logger = {
	info: (...args: unknown[]) => console.log(args),
	warn: (...args: unknown[]) => console.warn(args),
	error: (...args: unknown[]) => console.error(args),
};
