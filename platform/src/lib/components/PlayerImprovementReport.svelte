<script lang="ts">
	import { analyzePlayer } from '$lib/api/player-analysis.remote';
	import { formatImprovementChange } from '$lib/player-analysis/player-improvement';
	import { DRILLS_BY_WEAKNESS } from '$lib/player-analysis/drills-by-weakness';
	import DrillCard from '$lib/components/DrillCard.svelte';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import type { ImprovementMetric } from '$lib/schemas/player-analysis';

	let {
		playerId,
		heading = 'Improvement report',
	}: {
		playerId: string;
		heading?: string;
	} = $props();

	function formatValue(metric: ImprovementMetric, value: number | null) {
		if (value == null) return 'Not recorded';
		if (metric.format === 'percent') {
			return `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%`;
		}
		return value.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
	}

	function trendClass(trend: ImprovementMetric['trend']) {
		if (trend === 'up') return 'text-[#3FB950]';
		if (trend === 'down') return 'text-[#F85149]';
		return 'text-[#8B949E]';
	}

	function trendMark(trend: ImprovementMetric['trend']) {
		if (trend === 'up') return '↑';
		if (trend === 'down') return '↓';
		if (trend === 'flat') return '→';
		return '';
	}
</script>

<section class="flex flex-col gap-4 rounded-2xl border border-[#2A3038] bg-[#161B22] p-5 sm:p-6">
	<h2 class="text-sm font-semibold tracking-wide text-[#8B949E] uppercase">{heading}</h2>
	{#await analyzePlayer({ id: playerId })}
		<Skeleton class="h-32 w-full bg-[#0D1117]" />
	{:then report}
		{@const strengths = report.strengths.slice(0, 3)}
		{@const focusAreas = report.weaknesses.slice(0, 3)}
		{@const firstWeakness = focusAreas[0]}
		{@const { progress } = report}

		{#if progress.summary}
			<div class="rounded-xl border border-[#58A6FF]/25 bg-[#0D1117]/50 p-4">
				<p class="text-xs font-semibold tracking-wide text-[#58A6FF] uppercase">
					Development summary
				</p>
				<p class="mt-2 text-sm leading-relaxed text-[#E6EDF3]">{progress.summary}</p>
			</div>
		{/if}

		{#if progress.seasonGameCount > 0}
			<div class="rounded-xl border border-[#2A3038] bg-[#0D1117]/50 p-4">
				<p class="text-xs font-semibold tracking-wide text-[#8B949E] uppercase">
					{#if progress.recentWindow}
						This season vs last {progress.recentWindow} games
					{:else}
						This season
					{/if}
				</p>
				<p class="mt-1 text-xs text-[#8B949E]">
					{#if progress.recentWindow}
						Season average compared with the last {progress.recentWindow} games. Shooting uses total
						makes / attempts. Stats that were not recorded stay blank.
					{:else}
						Need at least 3 games this season to show a recent trend.
					{/if}
				</p>
				<div class="mt-3 overflow-x-auto">
					<table class="w-full min-w-[420px] text-left text-sm">
						<thead class="text-xs tracking-wide text-[#8B949E] uppercase">
							<tr>
								<th class="pb-2 font-medium">Stat</th>
								<th class="pb-2 font-medium tabular-nums">Season</th>
								<th class="pb-2 font-medium tabular-nums">Recent</th>
								<th class="pb-2 font-medium tabular-nums">Change</th>
							</tr>
						</thead>
						<tbody>
							{#each progress.metrics as metric (metric.key)}
								<tr class="border-t border-[#2A3038]/60">
									<td class="py-2 pr-3 font-medium">{metric.label}</td>
									<td class="py-2 pr-3 tabular-nums {metric.season == null ? 'text-[#8B949E]' : ''}">
										{formatValue(metric, metric.season)}
									</td>
									<td class="py-2 pr-3 tabular-nums {metric.recent == null ? 'text-[#8B949E]' : ''}">
										{formatValue(metric, metric.recent)}
									</td>
									<td class="py-2 tabular-nums {trendClass(metric.trend)}">
										{#if formatImprovementChange(metric)}
											{trendMark(metric.trend)}
											{formatImprovementChange(metric)}
										{:else}
											<span class="text-[#8B949E]">—</span>
										{/if}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		{/if}

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
