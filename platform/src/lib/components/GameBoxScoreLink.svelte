<script lang="ts">
	import { dashboardGameBoxHref } from '$lib/navigation/game-box';
	import type { Snippet } from 'svelte';

	let {
		orgSlug,
		seasonSlug,
		gameId,
		class: className = '',
		children,
	}: {
		orgSlug: string;
		seasonSlug: string | null | undefined;
		gameId: string;
		class?: string;
		children: Snippet;
	} = $props();
</script>

{#if seasonSlug}
	<a
		href={dashboardGameBoxHref(orgSlug, seasonSlug, gameId)}
		class="tabular-nums underline-offset-2 hover:underline {className}"
	>
		{@render children()}
	</a>
{:else}
	<span class="tabular-nums {className}">{@render children()}</span>
{/if}
