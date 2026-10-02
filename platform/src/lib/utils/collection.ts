export function sumBy<T>(items: T[], selector: (item: T) => number) {
	if (!items.length) {
		return 0;
	}

	return items.reduce((sum, item) => sum + selector(item), 0);
}

export function averageBy<T>(items: T[], selector: (item: T) => number) {
	if (!items.length) {
		return;
	}

	return sumBy(items, selector) / items.length;
}

/** True shooting %: PTS / (2 × (FGA + 0.44 × FTA)). Per-game rates match season totals. */
export function trueShootingPercentage(
	points: number,
	fieldGoalAttempts: number,
	freeThrowAttempts: number
) {
	const attempts = fieldGoalAttempts + 0.44 * freeThrowAttempts;
	if (attempts <= 0) return 0;
	return points / (2 * attempts);
}

/** Accurate shooting %: total makes / total attempts (not an average of per-game %). */
export function percentageBy<T>(
	items: T[],
	makesSelector: (item: T) => number,
	attemptsSelector: (item: T) => number
) {
	const attempts = sumBy(items, attemptsSelector);
	if (attempts <= 0) return 0;
	return sumBy(items, makesSelector) / attempts;
}

/** Makes cannot exceed attempts. Blank attempt columns count as at least the makes. */
export function shootingPct(makes: number, attempts: number) {
	const made = Math.max(0, makes);
	const attempted = Math.max(attempts, made);
	if (attempted <= 0) return 0;
	return made / attempted;
}

/**
 * Season shooting % from per-game lines. Makes on a 0-attempt game would otherwise
 * sit in the numerator and turn 22/1 into 2200%.
 */
export function shootingPercentageBy<T>(
	items: T[],
	makesSelector: (item: T) => number,
	attemptsSelector: (item: T) => number
) {
	let makes = 0;
	let attempts = 0;
	for (const item of items) {
		const made = Math.max(0, makesSelector(item));
		const attempted = Math.max(attemptsSelector(item), made);
		if (attempted <= 0) continue;
		makes += made;
		attempts += attempted;
	}
	if (attempts <= 0) return 0;
	return makes / attempts;
}

export function minBy<T>(items: T[], selector: (item: T) => number) {
	if (!items.length) {
		return;
	}

	return items.reduce((smallest, item) => Math.min(selector(item), smallest), selector(items[0]));
}

export function maxBy<T>(items: T[], selector: (item: T) => number) {
	if (!items.length) {
		return;
	}

	return items.reduce((largest, item) => Math.max(selector(item), largest), selector(items[0]));
}
