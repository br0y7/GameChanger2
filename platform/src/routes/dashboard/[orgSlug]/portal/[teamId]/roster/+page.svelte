<script lang="ts">
	import { getTeam } from '$lib/api/team.remote';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();
	const team = $derived(await getTeam({ id: params.teamId, include: { players: true } }));
	const players = $derived(
		[...(team.players ?? [])].sort((a, b) => Number(a.jerseyNumber) - Number(b.jerseyNumber))
	);
</script>

<section class="rounded-2xl border border-[#2A3038] bg-[#161B22] p-5">
	<h2 class="text-sm font-semibold tracking-wide text-[#8B949E] uppercase">Roster</h2>
	<p class="mt-1 text-sm text-[#8B949E]">View only — roster editing comes in a later phase.</p>

	{#if players.length === 0}
		<p class="mt-4 text-sm text-[#8B949E]">No players on this team yet.</p>
	{:else}
		<ul class="mt-4 divide-y divide-[#2A3038]">
			{#each players as player (player.id)}
				<li class="flex items-center justify-between py-3 text-sm">
					<span class="font-medium">{player.name}</span>
					<span class="tabular-nums text-[#8B949E]">#{player.jerseyNumber}</span>
				</li>
			{/each}
		</ul>
	{/if}
</section>
