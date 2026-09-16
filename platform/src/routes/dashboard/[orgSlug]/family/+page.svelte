<script lang="ts">
	import { PUBLIC_APP_NAME } from '$env/static/public';
	import { resolve } from '$app/paths';
	import { getOrganization } from '$lib/api/organization.remote';
	import { getMyFamilyPlayers } from '$lib/api/family.remote';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();
	const org = $derived(await getOrganization({ slug: params.orgSlug }));
	const players = $derived(await getMyFamilyPlayers());
	const orgPlayers = $derived(players.filter((p) => p.orgSlug === params.orgSlug));
</script>

<svelte:head>
	<title>My Players | {org.name} | {PUBLIC_APP_NAME}</title>
</svelte:head>

<div class="min-h-full bg-[#0D1117] text-[#E6EDF3]">
	<div class="mx-auto w-full max-w-lg space-y-6 px-4 py-8 sm:px-6">
		<header class="text-center">
			<p class="text-xs font-semibold tracking-wide text-[#58A6FF] uppercase">Family Portal</p>
			<h1 class="mt-2 text-2xl font-bold tracking-tight">My Players</h1>
			<p class="mt-1 text-sm text-[#8B949E]">Choose a player to view their GameChanger page.</p>
		</header>

		{#if orgPlayers.length === 0}
			<p class="text-center text-sm text-[#8B949E]">No linked players in this league yet.</p>
		{:else}
			<ul class="space-y-3">
				{#each orgPlayers as player (player.playerId)}
					<li>
						<a
							href={resolve('/dashboard/[orgSlug]/family/[playerId]', {
								orgSlug: params.orgSlug,
								playerId: player.playerId,
							})}
							class="block rounded-2xl border border-[#2A3038] bg-[#161B22] p-5 transition-colors hover:border-[#58A6FF]"
						>
							<p class="text-lg font-bold">{player.name}</p>
							<p class="mt-1 text-sm text-[#8B949E]">
								#{player.jerseyNumber} · {player.teamName}
								{#if player.divisionName}
									· {player.divisionName}
								{/if}
							</p>
						</a>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</div>
