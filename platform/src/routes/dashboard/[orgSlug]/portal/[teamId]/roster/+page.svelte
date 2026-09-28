<script lang="ts">
	import { isUserAdmin } from '$lib/api/auth.remote';
	import { getTeam } from '$lib/api/team.remote';
	import AdminPlayerRename from '$lib/components/AdminPlayerRename.svelte';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();
	const team = $derived(await getTeam({ id: params.teamId, include: { players: true } }));
	const players = $derived(
		[...(team.players ?? [])].sort((a, b) => Number(a.jerseyNumber) - Number(b.jerseyNumber))
	);
	const isAdmin = $derived(await isUserAdmin());
</script>

<section class="rounded-2xl border border-[#2A3038] bg-[#161B22] p-5">
	<h2 class="text-sm font-semibold tracking-wide text-[#8B949E] uppercase">Roster</h2>
	<p class="mt-1 text-sm text-[#8B949E]">
		{isAdmin
			? 'Coaches see this list read-only. As an admin you can rename players here.'
			: 'View only — roster editing comes in a later phase.'}
	</p>

	{#if players.length === 0}
		<p class="mt-4 text-sm text-[#8B949E]">No players on this team yet.</p>
	{:else}
		<ul class="mt-4 divide-y divide-[#2A3038]">
			{#each players as player (player.id)}
				<li class="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3 text-sm">
					<div class="flex flex-wrap items-center gap-x-3 gap-y-1">
						<span class="font-medium">{player.name}</span>
						<AdminPlayerRename playerId={player.id} name={player.name} class="" />
					</div>
					<span class="text-[#8B949E] tabular-nums">#{player.jerseyNumber}</span>
				</li>
			{/each}
		</ul>
	{/if}
</section>
