export const slugify = (text: string) =>
	text
		.normalize('NFD') // decompose accented characters
		.toLowerCase()
		.replace(/[\u0300-\u036f]/g, '') // remove accents
		.replace(/[^a-z0-9]+/g, '-') // replace with hyphen
		.replace(/^[-]+|-+$/g, ''); // remove leading or trailing hyphens
