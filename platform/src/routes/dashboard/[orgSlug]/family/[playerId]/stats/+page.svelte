<script lang="ts">
	import { getFamilyPlayerHome } from '$lib/api/family.remote';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();
	const home = $derived(await getFamilyPlayerHome({ playerId: params.playerId }));

	function fmt(n: number) {
		return n.toFixed(1);
	}
</script>

<section class="space-y-6">
	<div class="rounded-2xl border border-[#2A3038] bg-[#161B22]/80 p-5">
		<p class="text-xs font-semibold tracking-wide text-[#8B949E] uppercase">Season Averages</p>
		<div class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
			{#each [
				{ label: 'PPG', value: home.season.ppg },
				{ label: 'RPG', value: home.season.rpg },
				{ label: 'APG', value: home.season.apg },
				{ label: 'SPG', value: home.season.spg },
			] as stat (stat.label)}
				<div class="rounded-xl border border-[#2A3038] bg-[#0D1117]/50 p-4 text-center">
					<p class="text-2xl font-bold tabular-nums">{fmt(stat.value)}</p>
					<p class="mt-1 text-xs text-[#8B949E]">{stat.label}</p>
				</div>
			{/each}
		</div>
	</div>

	<div class="rounded-2xl border border-[#2A3038] bg-[#161B22]/80 p-5">
		<p class="text-xs font-semibold tracking-wide text-[#8B949E] uppercase">Game Log</p>
		{#if home.recentGames.length === 0}
			<p class="mt-3 text-sm text-[#8B949E]">No game stats yet.</p>
		{:else}
			<div class="mt-3 overflow-x-auto">
				<table class="w-full text-left text-sm">
					<thead class="text-xs text-[#8B949E] uppercase">
						<tr>
							<th class="pb-2 font-medium">Opponent</th>
							<th class="pb-2 font-medium tabular-nums">PTS</th>
							<th class="pb-2 font-medium tabular-nums">REB</th>
							<th class="pb-2 font-medium tabular-nums">AST</th>
							<th class="pb-2 font-medium tabular-nums">STL</th>
						</tr>
					</thead>
					<tbody>
						{#each home.recentGames as game (game.gameId)}
							<tr class="border-t border-[#2A3038]/60">
								<td class="py-2.5">{game.opponentName}</td>
								<td class="py-2.5 tabular-nums font-medium">{game.pts}</td>
								<td class="py-2.5 tabular-nums">{game.reb}</td>
								<td class="py-2.5 tabular-nums">{game.ast}</td>
								<td class="py-2.5 tabular-nums">{game.stl}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>
</section>
