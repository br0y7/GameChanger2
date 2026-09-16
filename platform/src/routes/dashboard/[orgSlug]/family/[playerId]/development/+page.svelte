<script lang="ts">
	import { getFamilyPlayerHome } from '$lib/api/family.remote';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();
	const home = $derived(await getFamilyPlayerHome({ playerId: params.playerId }));

	function fmt(n: number) {
		return n.toFixed(1);
	}

	function progressLabel(pct: number | null) {
		if (pct == null) return null;
		return `${pct > 0 ? '+' : ''}${pct}%`;
	}
</script>

<section class="space-y-6">
	{#if home.season.gp >= 2}
		<section class="rounded-2xl border border-[#2A3038] bg-[#161B22]/80 p-5">
			<p class="text-xs font-semibold tracking-wide text-[#8B949E] uppercase">Season Progress</p>
			<ul class="mt-4 space-y-4">
				{#each [
					{ label: 'Points per game', ...home.progress.points },
					{ label: 'Rebounds per game', ...home.progress.rebounds },
					{ label: 'Assists per game', ...home.progress.assists },
				] as row (row.label)}
					<li class="rounded-xl border border-[#2A3038] bg-[#0D1117]/50 p-4">
						<p class="font-medium">{row.label}</p>
						<p class="mt-2 text-sm text-[#8B949E]">
							Beginning <span class="tabular-nums text-[#E6EDF3]">{fmt(row.beginning)}</span>
							→ Current <span class="tabular-nums text-[#E6EDF3]">{fmt(row.current)}</span>
							{#if progressLabel(row.improvementPct)}
								<span
									class="ml-2 font-semibold {row.improvementPct && row.improvementPct > 0
										? 'text-[#3FB950]'
										: row.improvementPct && row.improvementPct < 0
											? 'text-[#F85149]'
											: 'text-[#8B949E]'}"
								>
									{progressLabel(row.improvementPct)}
								</span>
							{/if}
						</p>
					</li>
				{/each}
			</ul>
		</section>
	{/if}

	<div class="grid gap-3 sm:grid-cols-2">
		<section class="rounded-2xl border border-[#3FB950]/25 bg-[#161B22]/80 p-5">
			<p class="text-xs font-semibold tracking-wide text-[#3FB950] uppercase">Your Strengths</p>
			{#if home.strengths.length}
				<ul class="mt-3 space-y-2 text-sm">
					{#each home.strengths as item (item)}
						<li>{item}</li>
					{/each}
				</ul>
			{:else}
				<p class="mt-3 text-sm text-[#8B949E]">More games will reveal strengths.</p>
			{/if}
		</section>
		<section class="rounded-2xl border border-[#F0A020]/25 bg-[#161B22]/80 p-5">
			<p class="text-xs font-semibold tracking-wide text-[#F0A020] uppercase">
				Areas to Improve
			</p>
			{#if home.focusAreas.length}
				<ul class="mt-3 space-y-2 text-sm">
					{#each home.focusAreas as item (item)}
						<li>{item}</li>
					{/each}
				</ul>
			{:else}
				<p class="mt-3 text-sm text-[#8B949E]">No focus flags yet.</p>
			{/if}
		</section>
	</div>

	<section class="rounded-2xl border border-[#2A3038] bg-[#161B22]/80 p-5">
		<p class="text-xs font-semibold tracking-wide text-[#8B949E] uppercase">Coach Feedback</p>
		<p class="mt-2 text-xs text-[#8B949E]">Private — only your family can see this.</p>
		{#if home.coachFeedback}
			<p class="mt-3 text-sm leading-relaxed">“{home.coachFeedback}”</p>
		{:else}
			<p class="mt-3 text-sm text-[#8B949E]">
				Coach comments will show here once coaches can leave private notes (GameChanger 2.0).
			</p>
		{/if}
	</section>
</section>
