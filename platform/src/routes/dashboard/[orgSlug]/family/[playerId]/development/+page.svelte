<script lang="ts">
	import { getFamilyPlayerHome } from '$lib/api/family.remote';
	import PlayerImprovementReport from '$lib/components/PlayerImprovementReport.svelte';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();
	const home = $derived(await getFamilyPlayerHome({ playerId: params.playerId }));
</script>

<section class="space-y-6">
	<PlayerImprovementReport playerId={home.player.id} />

	<section class="rounded-2xl border border-[#2A3038] bg-[#161B22]/80 p-5">
		<p class="text-xs font-semibold tracking-wide text-[#8B949E] uppercase">Coach Feedback</p>
		<p class="mt-2 text-xs text-[#8B949E]">Private — only your family can see this.</p>
		{#if home.coachFeedback}
			<p class="mt-3 text-sm leading-relaxed">“{home.coachFeedback}”</p>
		{:else}
			<p class="mt-3 text-sm text-[#8B949E]">No coach notes yet.</p>
		{/if}
	</section>
</section>
