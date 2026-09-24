<script lang="ts">
	import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left';
	import { appHistory } from '$lib/navigation/app-history.svelte';

	let {
		fallbackHref,
		fallbackLabel,
		class: className = '',
	}: {
		fallbackHref: string;
		fallbackLabel: string;
		class?: string;
	} = $props();
</script>

{#if appHistory.canGoBack}
	<button
		type="button"
		class="inline-flex items-center gap-1 text-sm text-[#8B949E] transition-colors hover:text-[#58A6FF] {className}"
		onclick={() => history.back()}
	>
		<ChevronLeftIcon class="size-4" />
		Back
	</button>
{:else}
	<a
		href={fallbackHref}
		class="inline-flex items-center gap-1 text-sm text-[#8B949E] transition-colors hover:text-[#58A6FF] {className}"
	>
		<ChevronLeftIcon class="size-4" />
		{fallbackLabel}
	</a>
{/if}
