<script lang="ts">
	import { resolve } from '$app/paths';
	import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left';
	import { getDemoAccess } from '$lib/api/demo.remote';
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

	const demo = $derived(await getDemoAccess());
	const demoHomeHref = $derived(
		demo ? resolve('/dashboard/[orgSlug]', { orgSlug: demo.orgSlug }) : null
	);
	const href = $derived(demoHomeHref ?? fallbackHref);
	const label = $derived(demo ? 'Demo home' : fallbackLabel);
</script>

{#if !demo && appHistory.canGoBack}
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
		{href}
		class="inline-flex items-center gap-1 text-sm text-[#8B949E] transition-colors hover:text-[#58A6FF] {className}"
	>
		<ChevronLeftIcon class="size-4" />
		{label}
	</a>
{/if}
