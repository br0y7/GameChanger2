<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { onNavigate } from '$app/navigation';
	import { Toaster } from '$lib/components/ui/sonner/index.js';

	let { children } = $props();

	onNavigate((navigation) => {
		if (!document.startViewTransition) return;

		return new Promise((resolve) => {
			document.startViewTransition(async () => {
				resolve();
				// A redirect aborts this navigation and rejects `complete`. Letting that reject here
				// leaves the transition unfinished, which silently swallows every later click.
				await navigation.complete.catch(() => {});
			});
		});
	});
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<Toaster />

{@render children()}
