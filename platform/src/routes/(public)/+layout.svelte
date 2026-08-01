<script lang="ts">
	import NavBar from '$lib/components/NavBar.svelte';

	let { children } = $props();
</script>

<NavBar />

<div class="bg-background text-foreground min-h-screen w-full">
	{@render children()}
</div>
