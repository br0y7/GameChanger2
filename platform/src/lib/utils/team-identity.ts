/** Stable visual identity for teams without a stored logo/color. */

const TEAM_COLORS = [
	'#E74C3C',
	'#3498DB',
	'#2ECC71',
	'#9B59B6',
	'#F39C12',
	'#1ABC9C',
	'#E67E22',
	'#2980B9',
	'#16A085',
	'#C0392B',
] as const;

function hashString(value: string) {
	let hash = 0;
	for (let i = 0; i < value.length; i++) {
		hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
	}
	return hash;
}

export function teamColorFromId(id: string) {
	return TEAM_COLORS[hashString(id) % TEAM_COLORS.length];
}

export function teamInitials(name: string) {
	const parts = name.trim().split(/\s+/).filter(Boolean);
	if (parts.length === 0) return 'T';
	if (parts.length === 1) {
		const token = parts[0];
		const digits = token.match(/\d+/);
		if (digits) {
			const letters = token.replace(/\d+/g, '').slice(0, 1).toUpperCase() || 'T';
			return `${letters}${digits[0].slice(0, 2)}`;
		}
		return token.slice(0, 2).toUpperCase();
	}
	return parts
		.slice(0, 2)
		.map((part) => part[0]?.toUpperCase() ?? '')
		.join('');
}
