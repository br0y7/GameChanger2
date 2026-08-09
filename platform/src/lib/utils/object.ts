/**
 * Checks if any primitive value has changed between
 * the original and the current.
 * @param original object to reference
 * @param current object to loop keys
 * @returns true if there are changes
 */
export const hasShallowChanges = <T extends object>(original: T, current: T) =>
	Object.entries(current).some(([key, value]) => {
		switch (typeof value) {
			case 'string':
			case 'number':
			case 'bigint':
			case 'boolean':
			case 'undefined':
				return original[key as keyof T] !== value;
			default:
				return false;
		}
	});
