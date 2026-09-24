<script lang="ts">
	import { resolve } from '$app/paths';
	import { PUBLIC_APP_NAME } from '$env/static/public';
	import { getPublicStandings, listPublishedLeagues } from '$lib/api/public-stats.remote';

	const leagues = $derived(await listPublishedLeagues());
	let orgSlug = $state('');

	$effect(() => {
		if (!orgSlug && leagues[0]) orgSlug = leagues[0].slug;
	});

	const selected = $derived(leagues.find((l) => l.slug === orgSlug) ?? null);

	const standings = $derived(
		selected?.season && selected.visibility.publishStandings
			? await getPublicStandings({
					orgSlug: selected.slug,
					seasonSlug: selected.season.slug,
				})
			: { divisions: [], visibility: selected?.visibility }
	);
</script>

<svelte:head>
	<title>Standings | {PUBLIC_APP_NAME}</title>
</svelte:head>

<div class="mx-auto max-w-6xl px-4 py-12 sm:px-6" style="font-family: Figtree, system-ui, sans-serif">
	<p class="text-xs font-semibold tracking-[0.18em] text-[#8FA398] uppercase">Public</p>
	<h1
		class="mt-2 text-4xl font-bold tracking-tight text-[#E8F0EA]"
		style="font-family: 'Barlow Condensed', system-ui, sans-serif"
	>
		Standings
	</h1>
	<p class="mt-3 text-[#A8B8AE]">Division standings from leagues that publish results.</p>

	<label class="mt-6 block text-sm text-[#8FA398]">
		League
		<select
			class="ml-2 rounded-md border border-white/15 bg-[#151D19] px-3 py-2 text-[#E8F0EA]"
			bind:value={orgSlug}
		>
			{#each leagues as league (league.id)}
				<option value={league.slug}>{league.name}</option>
			{/each}
		</select>
	</label>

	{#if !selected}
		<p class="mt-10 text-sm text-[#8FA398]">No published leagues yet.</p>
	{:else if !selected.visibility.publishStandings}
		<p class="mt-10 text-sm text-[#8FA398]">This league has not published standings.</p>
	{:else if standings.divisions.length === 0}
		<p class="mt-10 text-sm text-[#8FA398]">No standings available yet.</p>
	{:else}
		{#if selected.season}
			<p class="mt-6 text-sm text-[#8FA398]">{selected.season.name}</p>
			<a
				href={resolve('/(public)/leagues/[orgSlug]/[seasonSlug]?tab=standings', {
					orgSlug: selected.slug,
					seasonSlug: selected.season.slug,
				})}
				class="mt-1 inline-block text-sm font-semibold text-[#B8E05C] hover:underline"
			>
				Full league stats →
			</a>
		{/if}
		<div class="mt-8 grid gap-8 md:grid-cols-2">
			{#each standings.divisions as div (div.id)}
				<section class="border border-white/10 bg-[#151D19] p-5">
					<h2 class="text-sm font-semibold tracking-wide text-[#8FA398] uppercase">{div.name}</h2>
					<ul class="mt-3 space-y-2">
						{#each div.rows as row, i (row.teamId)}
							<li class="flex justify-between text-sm">
								<span>
									<span class="mr-2 tabular-nums text-[#8FA398]">{i + 1}.</span>
									{row.name}
								</span>
								<span class="tabular-nums font-medium">{row.wins}–{row.losses}</span>
							</li>
						{/each}
					</ul>
				</section>
			{/each}
		</div>
	{/if}
</div>
