<script lang="ts">
	import { resolve } from '$app/paths';
	import { getFamilyPlayerHome } from '$lib/api/family.remote';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();
	const home = $derived(await getFamilyPlayerHome({ playerId: params.playerId }));

	const base = $derived(
		resolve('/dashboard/[orgSlug]/family/[playerId]', {
			orgSlug: params.orgSlug,
			playerId: params.playerId,
		})
	);

	function fmt(n: number) {
		return n.toFixed(1);
	}

	function progressLabel(pct: number | null) {
		if (pct == null) return null;
		const sign = pct > 0 ? '+' : '';
		return `${sign}${pct}%`;
	}

	function progressClass(pct: number | null) {
		if (pct == null) return 'text-[#8B949E]';
		if (pct > 0) return 'text-[#3FB950]';
		if (pct < 0) return 'text-[#F85149]';
		return 'text-[#8B949E]';
	}
</script>

<section class="space-y-6">
	<div class="text-center">
		<p class="text-xs font-semibold tracking-wide text-[#8B949E] uppercase">My Player</p>
		<p class="mt-2 text-sm text-[#8B949E]">
			{home.player.divisionName || 'Division'} – {home.player.leagueName}
		</p>
	</div>

	<section>
		<p class="mb-3 text-center text-xs font-semibold tracking-wide text-[#8B949E] uppercase">
			Season Stats
		</p>
		<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
			{#each [
				{ label: 'PPG', value: home.season.ppg },
				{ label: 'RPG', value: home.season.rpg },
				{ label: 'APG', value: home.season.apg },
				{ label: 'SPG', value: home.season.spg },
			] as stat (stat.label)}
				<div
					class="rounded-2xl border border-[#2A3038] bg-[#161B22]/80 px-3 py-5 text-center backdrop-blur"
				>
					<p class="text-3xl font-extrabold tabular-nums tracking-tight text-[#E6EDF3]">
						{fmt(stat.value)}
					</p>
					<p class="mt-1 text-xs font-semibold tracking-wide text-[#8B949E] uppercase">
						{stat.label}
					</p>
				</div>
			{/each}
		</div>
		<p class="mt-2 text-center text-xs text-[#8B949E]">{home.season.gp} games played</p>
	</section>

	{#if home.season.gp >= 2}
		<section class="rounded-2xl border border-[#2A3038] bg-[#161B22]/80 p-5">
			<p class="text-xs font-semibold tracking-wide text-[#8B949E] uppercase">Season Progress</p>
			<p class="mt-1 text-sm text-[#8B949E]">Early season vs recent form</p>
			<ul class="mt-4 space-y-4">
				{#each [
					{ label: 'Points per game', ...home.progress.points },
					{ label: 'Rebounds per game', ...home.progress.rebounds },
					{ label: 'Assists per game', ...home.progress.assists },
				] as row (row.label)}
					<li>
						<p class="text-sm font-medium">{row.label}</p>
						<p class="mt-1 text-sm text-[#8B949E]">
							Season beginning: <span class="tabular-nums text-[#E6EDF3]">{fmt(row.beginning)}</span>
							· Current:
							<span class="tabular-nums text-[#E6EDF3]">{fmt(row.current)}</span>
							{#if progressLabel(row.improvementPct)}
								<span class="ml-1 font-semibold {progressClass(row.improvementPct)}">
									{progressLabel(row.improvementPct)} improvement
								</span>
							{/if}
						</p>
					</li>
				{/each}
			</ul>
		</section>
	{/if}

	<section class="rounded-2xl border border-[#2A3038] bg-[#161B22]/80 p-5">
		<div class="flex items-center justify-between gap-2">
			<p class="text-xs font-semibold tracking-wide text-[#8B949E] uppercase">Recent Games</p>
			<a href={`${base}/stats`} class="text-xs text-[#58A6FF] hover:underline">All stats →</a>
		</div>
		{#if home.recentGames.length === 0}
			<p class="mt-3 text-sm text-[#8B949E]">No games recorded yet.</p>
		{:else}
			<div class="mt-3 overflow-x-auto">
				<table class="w-full text-left text-sm">
					<thead class="text-xs text-[#8B949E] uppercase">
						<tr>
							<th class="pb-2 font-medium">Opponent</th>
							<th class="pb-2 font-medium tabular-nums">PTS</th>
							<th class="pb-2 font-medium tabular-nums">REB</th>
							<th class="pb-2 font-medium tabular-nums">AST</th>
						</tr>
					</thead>
					<tbody>
						{#each home.recentGames as game (game.gameId)}
							<tr class="border-t border-[#2A3038]/60">
								<td class="py-2.5">{game.opponentName}</td>
								<td class="py-2.5 tabular-nums font-medium">{game.pts}</td>
								<td class="py-2.5 tabular-nums">{game.reb}</td>
								<td class="py-2.5 tabular-nums">{game.ast}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</section>

	<section class="grid gap-3 sm:grid-cols-2">
		<div class="rounded-2xl border border-[#3FB950]/25 bg-[#161B22]/80 p-5">
			<p class="text-xs font-semibold tracking-wide text-[#3FB950] uppercase">Your Strengths</p>
			{#if home.strengths.length}
				<ul class="mt-3 space-y-1.5 text-sm">
					{#each home.strengths as item (item)}
						<li>{item}</li>
					{/each}
				</ul>
			{:else}
				<p class="mt-3 text-sm text-[#8B949E]">Keep playing — strengths appear with more games.</p>
			{/if}
			<a href={`${base}/development`} class="mt-3 inline-block text-xs text-[#58A6FF] hover:underline"
				>Full development →</a
			>
		</div>
		<div class="rounded-2xl border border-[#F0A020]/25 bg-[#161B22]/80 p-5">
			<p class="text-xs font-semibold tracking-wide text-[#F0A020] uppercase">Focus Areas</p>
			{#if home.focusAreas.length}
				<ul class="mt-3 space-y-1.5 text-sm">
					{#each home.focusAreas as item (item)}
						<li>{item}</li>
					{/each}
				</ul>
			{:else}
				<p class="mt-3 text-sm text-[#8B949E]">No clear focus flags yet.</p>
			{/if}
		</div>
	</section>

	<section class="rounded-2xl border border-[#2A3038] bg-[#161B22]/80 p-5">
		<p class="text-xs font-semibold tracking-wide text-[#8B949E] uppercase">Coach Feedback</p>
		{#if home.coachFeedback}
			<p class="mt-3 text-sm leading-relaxed text-[#E6EDF3]">“{home.coachFeedback}”</p>
		{:else}
			<p class="mt-3 text-sm text-[#8B949E]">
				Private coach notes for your family will appear here in a future update. Only you and league
				staff can see this section — never other families.
			</p>
		{/if}
	</section>
</section>
