<script lang="ts">
	import { resolve } from '$app/paths';
	import { PUBLIC_APP_NAME } from '$env/static/public';
	import { listPublishedLeagues } from '$lib/api/public-stats.remote';

	const leagues = $derived(await listPublishedLeagues());
</script>

<svelte:head>
	<title>Leagues | {PUBLIC_APP_NAME}</title>
</svelte:head>

<div class="mx-auto max-w-6xl px-4 py-12 sm:px-6" style="font-family: Figtree, system-ui, sans-serif">
	<p class="text-xs font-semibold tracking-[0.18em] text-[#8FA398] uppercase">Discover</p>
	<h1
		class="mt-2 text-4xl font-bold tracking-tight text-[#E8F0EA] sm:text-5xl"
		style="font-family: 'Barlow Condensed', system-ui, sans-serif"
	>
		Leagues
	</h1>
	<p class="mt-3 max-w-2xl text-[#A8B8AE]">
		Explore basketball statistics from leagues that publish their data on GameChanger.
	</p>

	{#if leagues.length === 0}
		<p class="mt-10 text-sm text-[#8FA398]">No leagues have published stats yet.</p>
	{:else}
		<ul class="mt-10 grid gap-4 sm:grid-cols-2">
			{#each leagues as league (league.id)}
				<li class="border border-white/10 bg-[#151D19] p-6">
					<h2
						class="text-2xl font-bold"
						style="font-family: 'Barlow Condensed', system-ui, sans-serif"
					>
						{league.name}
					</h2>
					{#if league.season}
						<p class="mt-1 text-sm text-[#8FA398]">{league.season.name}</p>
					{/if}
					<p class="mt-4 text-sm text-[#A8B8AE]">
						{league.counts.players} Players · {league.counts.teams} Teams ·
						{league.counts.divisions} Divisions
						{#if league.counts.games}
							· {league.counts.games} Games
						{/if}
					</p>
					{#if league.season}
						<a
							href={resolve('/leagues/[orgSlug]/[seasonSlug]', {
								orgSlug: league.slug,
								seasonSlug: league.season.slug,
							})}
							class="mt-6 inline-flex rounded-md bg-[#B8E05C] px-4 py-2 text-sm font-semibold text-[#0C1210] hover:bg-[#C8E06A]"
						>
							View Stats
						</a>
					{:else}
						<span class="mt-6 inline-block text-sm text-[#8FA398]">No season yet</span>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
</div>
