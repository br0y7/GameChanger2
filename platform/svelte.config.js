// Prevents 'no request state' error in prod build after login (was using adapter-bun before)
// The error sometimes happen after login -> dashboard. Refreshing the page resolved it.
// Using adapter-node prevents the error entirely.
import adapter from '@sveltejs/adapter-node';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	compilerOptions: {
		// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
		runes: ({ filename }) => (filename.split(/[/\\]/).includes('node_modules') ? undefined : true),

		experimental: {
			async: true,
		},
	},
	kit: {
		// adapter-auto only supports some environments, see https://svelte.dev/docs/kit/adapter-auto for a list.
		// If your environment is not supported, or you settled on a specific environment, switch out the adapter.
		// See https://svelte.dev/docs/kit/adapters for more information about adapters.
		adapter: adapter(),

		paths: {
			// Resolved links are absolute. Relative ones are read against whatever page they render
			// on, so any component that builds a link once (the nav bar does) keeps the first
			// page's version and sends you somewhere else after a client side navigation.
			relative: false,
		},

		typescript: {
			config: (config) => ({
				...config,
				include: [...config.include, '../drizzle.config.ts', '../scripts/**/*.ts'],
			}),
		},

		experimental: {
			remoteFunctions: true,
		},
	},
};

export default config;
