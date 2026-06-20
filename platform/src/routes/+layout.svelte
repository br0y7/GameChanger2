<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { ModeWatcher } from 'mode-watcher';
	import ModeToggle from '$lib/components/ui/ModeToggle.svelte';
	import { page } from '$app/state';
	import { fade } from 'svelte/transition';

	let { children } = $props();
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<ModeWatcher />

<div class="bg-background text-foreground min-h-screen w-full">
	{#key page.url.pathname}
		<div in:fade={{ duration: 150 }}>
			{@render children()}
		</div>
	{/key}

	<div class="absolute top-4 right-4 z-50">
		<ModeToggle />
	</div>
</div>
