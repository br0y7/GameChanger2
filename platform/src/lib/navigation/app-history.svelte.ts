/** True after an in-app navigation, so Back returns to the previous page. */
export const appHistory = $state({
	canGoBack: false,
});

const LAST_PATH_KEY = 'gc:last-path';
const PREV_PATH_KEY = 'gc:prev-path';

function readStored(key: string) {
	if (typeof sessionStorage === 'undefined') return null;
	try {
		return sessionStorage.getItem(key);
	} catch {
		return null;
	}
}

function writeStored(key: string, value: string) {
	if (typeof sessionStorage === 'undefined') return;
	try {
		sessionStorage.setItem(key, value);
	} catch {
		// Ignore quota / blocked storage.
	}
}

export function noteNavigation(fromPath: string | null, toPath: string | null) {
	if (!toPath) return;

	const last = fromPath ?? readStored(LAST_PATH_KEY);
	if (last && last !== toPath) {
		writeStored(PREV_PATH_KEY, last);
		appHistory.canGoBack = true;
	} else {
		const previous = readStored(PREV_PATH_KEY);
		appHistory.canGoBack = !!previous && previous !== toPath;
	}
	writeStored(LAST_PATH_KEY, toPath);
}
