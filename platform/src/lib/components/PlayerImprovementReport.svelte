<script lang="ts">
	import { analyzePlayer } from '$lib/api/player-analysis.remote';
	import { DRILLS_BY_WEAKNESS } from '$lib/player-analysis/drills-by-weakness';
	import DrillCard from '$lib/components/DrillCard.svelte';
	import { Skeleton } from '$lib/components/ui/skeleton';

	let {
		playerId,
		heading = 'Improvement report',
	}: {
		playerId: string;
		heading?: string;
	} = $props();
</script>

<section class="flex flex-col gap-4 rounded-2xl border border-[#2A3038] bg-[#161B22] p-5 sm:p-6">
	<h2 class="text-sm font-semibold tracking-wide text-[#8B949E] uppercase">{heading}</h2>
	{#await analyzePlayer({ id: playerId })}
		<Skeleton class="h-32 w-full bg-[#0D1117]" />
	{:then report}
		{@const strengths = report.strengths.slice(0, 3)}
		{@const focusAreas = report.weaknesses.slice(0, 3)}
		{@const firstWeakness = focusAreas[0]}

		<div class="grid gap-3 sm:grid-cols-2">
			<div class="rounded-xl border border-[#3FB950]/25 bg-[#0D1117]/50 p-4">
				<p class="text-xs font-semibold tracking-wide text-[#3FB950] uppercase">Strengths</p>
				{#if strengths.length}
					<ul class="mt-3 space-y-2 text-sm text-[#E6EDF3]">
						{#each strengths as item (item.description)}
							<li>
								{item.description}
								{#if item.stat}
									<span class="text-[#8B949E]">· {item.stat.display} {item.stat.label}</span>
								{/if}
							</li>
						{/each}
					</ul>
				{:else}
					<p class="mt-3 text-sm text-[#8B949E]">More games will reveal strengths.</p>
				{/if}
			</div>
			<div class="rounded-xl border border-[#F0A020]/25 bg-[#0D1117]/50 p-4">
				<p class="text-xs font-semibold tracking-wide text-[#F0A020] uppercase">Areas to improve</p>
				{#if focusAreas.length}
					<ul class="mt-3 space-y-2 text-sm text-[#E6EDF3]">
						{#each focusAreas as item (item.description)}
							<li>
								{item.description}
								{#if item.stat}
									<span class="text-[#8B949E]">· {item.stat.display} {item.stat.label}</span>
								{/if}
							</li>
						{/each}
					</ul>
				{:else}
					<p class="mt-3 text-sm text-[#8B949E]">No focus flags yet.</p>
				{/if}
			</div>
		</div>

		{#if firstWeakness}
			<div class="flex flex-col gap-3">
				<p class="text-sm font-medium text-[#8B949E]">
					Suggested drills
					<span class="font-normal">for {firstWeakness.description}</span>
				</p>
				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
					{#each DRILLS_BY_WEAKNESS[firstWeakness.category] as drill (drill.name)}
						<DrillCard {drill} />
					{/each}
				</div>
			</div>
		{/if}
	{/await}
</section>
