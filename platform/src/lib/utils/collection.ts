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
