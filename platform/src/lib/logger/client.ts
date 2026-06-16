import { dev } from '$app/environment';
import type { Logger } from './types';

export const clientLogger: Logger = {
	info: (...args: unknown[]) => {
		if (dev) {
			console.log(args);
		}
	},
	warn: (...args: unknown[]) => {
		if (dev) {
			console.warn(args);
		}
	},
	error: (...args: unknown[]) => {
		if (dev) {
			console.error(args);
		}
	},
};
