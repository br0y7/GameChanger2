<script lang="ts">
	import ModeToggle from '$lib/components/ui/ModeToggle.svelte';

	let { children } = $props();
</script>

<div class="relative">
	<div class="absolute top-2 right-2">
		<ModeToggle />
	</div>
	<main>
		{@render children()}
	</main>
</div>
