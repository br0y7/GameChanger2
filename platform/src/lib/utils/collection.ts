export function averageBy<T>(items: T[], selector: (item: T) => number) {
	if (!items || items.length <= 0) {
		return 0;
	}

	return items.reduce((sum, item) => sum + selector(item), 0) / items.length;
}
