<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { onNavigate } from '$app/navigation';
	import { Toaster } from '$lib/components/ui/sonner/index.js';

	let { children } = $props();

	onNavigate((navigation) => {
		if (!document.startViewTransition || navigation.willUnload) return;

		const dest = navigation.to?.url.pathname ?? '';
		// /dashboard always 30x-redirects, and dashboard layouts use top-level `await`.
		// A view transition that waits on that `complete` never paints the destination —
		// and in some cases never finishes, so the browser swallows later clicks.
		if (dest === '/dashboard' || dest.startsWith('/dashboard/') || dest === '/logout') return;

		return new Promise((resolve) => {
			document.startViewTransition(async () => {
				resolve();
				await Promise.race([
					navigation.complete.catch(() => {}),
					new Promise((r) => setTimeout(r, 2000)),
				]);
			});
		});
	});
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<Toaster />

{@render children()}
