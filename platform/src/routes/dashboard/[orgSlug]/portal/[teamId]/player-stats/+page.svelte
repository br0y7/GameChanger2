<script lang="ts">
	import { resolve } from '$app/paths';
	import { getCoachTeamPlayerStats } from '$lib/api/coach-player-stats.remote';
	import { getPortalTeamContext } from '$lib/api/coach-portal.remote';
	import { getTeam } from '$lib/api/team.remote';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();

	const team = $derived(await getTeam({ id: params.teamId }));
	const context = $derived(await getPortalTeamContext({ teamId: params.teamId }));
	const season = $derived(context?.season);
	const data = $derived(await getCoachTeamPlayerStats({ teamId: params.teamId }));

	let search = $state('');
	let showMore = $state(false);

	const filtered = $derived(
		data.rows.filter((row) => {
			if (!search.trim()) return true;
			const q = search.trim().toLowerCase();
			return row.name.toLowerCase().includes(q) || row.jerseyNumber.includes(q);
		})
	);

	function fmt(n: number, digits = 1) {
		return n.toFixed(digits);
	}

	function fmtPct(n: number) {
		return `${(n * 100).toFixed(1)}%`;
	}

	function formatUpdated(d: Date | null) {
		if (!d) return null;
		return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	}

	function playerHref(playerId: string) {
		return resolve('/dashboard/[orgSlug]/portal/[teamId]/player-stats/[playerId]', {
			orgSlug: params.orgSlug,
			teamId: params.teamId,
			playerId,
		});
	}
</script>

<section class="space-y-4">
	<header class="flex flex-wrap items-end justify-between gap-3">
		<div>
			<h2 class="text-lg font-bold tracking-tight uppercase">
				{team.name} — Player Stats
			</h2>
			<p class="mt-1 text-sm text-[#8B949E]">{season?.name ?? 'Season'}</p>
		</div>
	</header>

	<div class="flex flex-wrap items-center gap-3">
		<input
			type="search"
			bind:value={search}
			placeholder="Search player..."
			class="min-w-[200px] flex-1 rounded-md border border-[#2A3038] bg-[#0D1117] px-3 py-2 text-sm text-[#E6EDF3] placeholder:text-[#8B949E] focus:border-[#58A6FF] focus:outline-none"
		/>
		<select
			class="rounded-md border border-[#2A3038] bg-[#0D1117] px-3 py-2 text-sm text-[#E6EDF3]"
			disabled
			title="Coming soon"
		>
			<option>All Games</option>
		</select>
		<button
			type="button"
			class="rounded-md border border-[#2A3038] bg-[#161B22] px-3 py-2 text-sm font-medium hover:border-[#58A6FF]"
			onclick={() => (showMore = !showMore)}
		>
			{showMore ? 'Fewer Stats' : 'More Stats'}
		</button>
	</div>

	{#if filtered.length === 0}
		<p class="rounded-2xl border border-[#2A3038] bg-[#161B22] p-5 text-sm text-[#8B949E]">
			{data.rows.length === 0
				? 'No player stats yet for this team.'
				: 'No players match your search.'}
		</p>
	{:else}
		<div class="overflow-x-auto rounded-2xl border border-[#2A3038] bg-[#161B22]">
			<table class="w-full min-w-[640px] text-left text-sm">
				<thead class="border-b border-[#2A3038] text-xs tracking-wide text-[#8B949E] uppercase">
					<tr>
						<th class="px-4 py-3 font-medium">Player</th>
						<th class="px-3 py-3 font-medium tabular-nums">GP</th>
						<th class="px-3 py-3 font-medium tabular-nums">PPG</th>
						<th class="px-3 py-3 font-medium tabular-nums">REB</th>
						<th class="px-3 py-3 font-medium tabular-nums">RPG</th>
						<th class="px-3 py-3 font-medium tabular-nums">AST</th>
						<th class="px-3 py-3 font-medium tabular-nums">APG</th>
						{#if showMore}
							<th class="px-3 py-3 font-medium tabular-nums">STL</th>
							<th class="px-3 py-3 font-medium tabular-nums">BLK</th>
							<th class="px-3 py-3 font-medium tabular-nums">TO</th>
							<th class="px-3 py-3 font-medium tabular-nums">FG%</th>
							<th class="px-3 py-3 font-medium tabular-nums">3PT%</th>
							<th class="px-3 py-3 font-medium tabular-nums">FT%</th>
						{/if}
					</tr>
				</thead>
				<tbody>
					{#each filtered as row (row.playerId)}
						<tr class="border-b border-[#2A3038]/60 hover:bg-[#0D1117]/60">
							<td class="px-4 py-3">
								<a href={playerHref(row.playerId)} class="font-medium text-[#58A6FF] hover:underline">
									{row.name}
								</a>
								<span class="ml-2 text-xs text-[#8B949E]">#{row.jerseyNumber}</span>
							</td>
							<td class="px-3 py-3 tabular-nums">{row.gp}</td>
							<td class="px-3 py-3 tabular-nums">{fmt(row.ppg)}</td>
							<td class="px-3 py-3 tabular-nums">{row.reb}</td>
							<td class="px-3 py-3 tabular-nums">{fmt(row.rpg)}</td>
							<td class="px-3 py-3 tabular-nums">{row.ast}</td>
							<td class="px-3 py-3 tabular-nums">{fmt(row.apg)}</td>
							{#if showMore}
								<td class="px-3 py-3 tabular-nums">{row.stl}</td>
								<td class="px-3 py-3 tabular-nums">{row.blk}</td>
								<td class="px-3 py-3 tabular-nums">{row.tov}</td>
								<td class="px-3 py-3 tabular-nums">{fmtPct(row.fgPct)}</td>
								<td class="px-3 py-3 tabular-nums">{fmtPct(row.fg3Pct)}</td>
								<td class="px-3 py-3 tabular-nums">{fmtPct(row.ftPct)}</td>
							{/if}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}

	<p class="text-xs text-[#8B949E]">
		Stats are managed by the league organizer.
		{#if formatUpdated(data.lastUpdated)}
			Last updated: {formatUpdated(data.lastUpdated)}
		{/if}
	</p>
</section>
