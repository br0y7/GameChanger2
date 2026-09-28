<script lang="ts">
	import { resolve } from '$app/paths';
	import { PUBLIC_APP_NAME } from '$env/static/public';
	import {
		getPublicLeagueMeta,
		getPublicSeasonFilters,
		getPublicStandings,
		listPublishedLeagues,
	} from '$lib/api/public-stats.remote';

	const leagues = $derived(await listPublishedLeagues());
	let orgSlug = $state('');
	let seasonSlug = $state('');
	let divisionSlug = $state('');

	$effect(() => {
		if (!orgSlug && leagues[0]) {
			orgSlug = leagues[0].slug;
			seasonSlug = leagues[0].season?.slug ?? '';
		}
	});

	const selected = $derived(leagues.find((l) => l.slug === orgSlug) ?? null);
	const meta = $derived(orgSlug ? await getPublicLeagueMeta({ orgSlug }) : null);
	const seasonFilters = $derived(
		orgSlug && seasonSlug ? await getPublicSeasonFilters({ orgSlug, seasonSlug }) : null
	);

	const standings = $derived(
		selected?.visibility.publishStandings && seasonSlug
			? await getPublicStandings({
					orgSlug: selected.slug,
					seasonSlug,
					divisionSlug: divisionSlug || undefined,
				})
			: { divisions: [], visibility: selected?.visibility }
	);
</script>

<svelte:head>
	<title>Standings | {PUBLIC_APP_NAME}</title>
</svelte:head>

<div
	class="mx-auto max-w-6xl px-4 py-12 sm:px-6"
	style="font-family: Figtree, system-ui, sans-serif"
>
	<p class="text-xs font-semibold tracking-[0.18em] text-[#8FA398] uppercase">Public</p>
	<h1
		class="mt-2 text-4xl font-bold tracking-tight text-[#E8F0EA]"
		style="font-family: 'Barlow Condensed', system-ui, sans-serif"
	>
		Standings
	</h1>
	<p class="mt-3 text-[#A8B8AE]">Division standings from leagues that publish results.</p>

	<div class="mt-6 flex flex-wrap gap-3">
		<label class="text-sm text-[#8FA398]">
			League
			<select
				class="ml-2 rounded-md border border-white/15 bg-[#151D19] px-3 py-2 text-[#E8F0EA]"
				bind:value={orgSlug}
				onchange={() => {
					seasonSlug = meta?.seasons[0]?.slug ?? '';
					divisionSlug = '';
				}}
			>
				{#each leagues as league (league.id)}
					<option value={league.slug}>{league.name}</option>
				{/each}
			</select>
		</label>
		{#if meta && meta.seasons.length > 0}
			<label class="text-sm text-[#8FA398]">
				Season
				<select
					class="ml-2 rounded-md border border-white/15 bg-[#151D19] px-3 py-2 text-[#E8F0EA]"
					bind:value={seasonSlug}
					onchange={() => (divisionSlug = '')}
				>
					{#each meta.seasons as season (season.id)}
						<option value={season.slug}>{season.name}</option>
					{/each}
				</select>
			</label>
		{/if}
		{#if seasonFilters}
			<label class="text-sm text-[#8FA398]">
				Division
				<select
					class="ml-2 rounded-md border border-white/15 bg-[#151D19] px-3 py-2 text-[#E8F0EA]"
					bind:value={divisionSlug}
				>
					<option value="">All divisions</option>
					{#each seasonFilters.divisions as division (division.id)}
						<option value={division.slug}>{division.name}</option>
					{/each}
				</select>
			</label>
		{/if}
	</div>

	{#if !selected}
		<p class="mt-10 text-sm text-[#8FA398]">No published leagues yet.</p>
	{:else if !selected.visibility.publishStandings}
		<p class="mt-10 text-sm text-[#8FA398]">This league has not published standings.</p>
	{:else if standings.divisions.length === 0}
		<p class="mt-10 text-sm text-[#8FA398]">No standings available yet.</p>
	{:else}
		{#if meta?.seasons.find((s) => s.slug === seasonSlug)}
			<p class="mt-6 text-sm text-[#8FA398]">
				{meta.seasons.find((s) => s.slug === seasonSlug)?.name}
			</p>
			<a
				href={resolve(
					divisionSlug
						? `/(public)/leagues/[orgSlug]/[seasonSlug]?tab=standings&division=${divisionSlug}`
						: '/(public)/leagues/[orgSlug]/[seasonSlug]?tab=standings',
					{
						orgSlug: selected.slug,
						seasonSlug,
					}
				)}
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
						{#each div.rows as row (row.teamId)}
							<li class="flex justify-between text-sm">
								<span>
									<span class="mr-2 text-[#8FA398] tabular-nums">{row.rank}.</span>
									<a
										href={resolve(
											`/(public)/leagues/[orgSlug]/[seasonSlug]?tab=players&division=${div.slug}&team=${row.slug}`,
											{ orgSlug: selected.slug, seasonSlug }
										)}
										class="hover:text-[#B8E05C] hover:underline"
									>
										{row.name}
									</a>
								</span>
								<span class="font-medium tabular-nums">{row.wins}–{row.losses}</span>
							</li>
						{/each}
					</ul>
				</section>
			{/each}
		</div>
	{/if}
</div>
