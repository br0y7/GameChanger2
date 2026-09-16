<script lang="ts">
	import { resolve } from '$app/paths';
	import { PUBLIC_APP_NAME } from '$env/static/public';
	import {
		getPublicPlayerLeaders,
		listPublishedLeagues,
	} from '$lib/api/public-stats.remote';

	const leagues = $derived(await listPublishedLeagues());

	let selectedOrg = $state('');
	let selectedSeason = $state('');

	$effect(() => {
		if (!selectedOrg && leagues[0]) {
			selectedOrg = leagues[0].slug;
			selectedSeason = leagues[0].season?.slug ?? '';
		}
	});

	const selected = $derived(leagues.find((l) => l.slug === selectedOrg) ?? null);

	const leaders = $derived(
		selected?.season && selected.visibility.publishPlayerStats
			? await getPublicPlayerLeaders({
					orgSlug: selected.slug,
					seasonSlug: selectedSeason || selected.season.slug,
					limit: 5,
				})
			: { players: [], visibility: selected?.visibility }
	);

	const topPts = $derived(leaders.players[0] ?? null);
	const topReb = $derived(
		[...leaders.players].sort((a, b) => b.rpg - a.rpg)[0] ?? null
	);
	const topAst = $derived(
		[...leaders.players].sort((a, b) => b.apg - a.apg)[0] ?? null
	);
</script>

<svelte:head>
	<title>Stats | {PUBLIC_APP_NAME}</title>
</svelte:head>

<div class="mx-auto max-w-6xl px-4 py-12 sm:px-6" style="font-family: Figtree, system-ui, sans-serif">
	<p class="text-xs font-semibold tracking-[0.18em] text-[#8FA398] uppercase">Public</p>
	<h1
		class="mt-2 text-4xl font-bold tracking-tight text-[#E8F0EA] sm:text-5xl"
		style="font-family: 'Barlow Condensed', system-ui, sans-serif"
	>
		Explore League Statistics
	</h1>
	<p class="mt-3 max-w-2xl text-[#A8B8AE]">
		Browse performance stats from participating leagues — no account required. Development reports
		and coach feedback stay private.
	</p>

	<div class="mt-8 flex flex-wrap gap-3">
		<label class="text-sm text-[#8FA398]">
			League
			<select
				class="ml-2 rounded-md border border-white/15 bg-[#151D19] px-3 py-2 text-[#E8F0EA]"
				bind:value={selectedOrg}
				onchange={() => {
					selectedSeason = leagues.find((l) => l.slug === selectedOrg)?.season?.slug ?? '';
				}}
			>
				{#each leagues as league (league.id)}
					<option value={league.slug}>{league.name}</option>
				{/each}
			</select>
		</label>
		{#if selected?.season}
			<label class="text-sm text-[#8FA398]">
				Season
				<select
					class="ml-2 rounded-md border border-white/15 bg-[#151D19] px-3 py-2 text-[#E8F0EA]"
					bind:value={selectedSeason}
				>
					<option value={selected.season.slug}>{selected.season.name}</option>
				</select>
			</label>
		{/if}
		{#if selected?.season}
			<a
				href={resolve('/leagues/[orgSlug]/[seasonSlug]', {
					orgSlug: selected.slug,
					seasonSlug: selectedSeason || selected.season.slug,
				})}
				class="inline-flex items-center rounded-md bg-[#B8E05C] px-4 py-2 text-sm font-semibold text-[#0C1210] hover:bg-[#C8E06A]"
			>
				View Stats
			</a>
		{/if}
	</div>

	<section class="mt-14">
		<h2
			class="text-2xl font-bold"
			style="font-family: 'Barlow Condensed', system-ui, sans-serif"
		>
			Featured Leagues
		</h2>
		{#if leagues.length === 0}
			<p class="mt-4 text-sm text-[#8FA398]">No published leagues yet.</p>
		{:else}
			<ul class="mt-6 grid gap-4 sm:grid-cols-2">
				{#each leagues as league (league.id)}
					<li class="border border-white/10 bg-[#151D19] p-5">
						<p class="text-lg font-bold">{league.name}</p>
						{#if league.season}
							<p class="mt-1 text-sm text-[#8FA398]">{league.season.name}</p>
						{/if}
						<p class="mt-3 text-sm text-[#A8B8AE]">
							{league.counts.players} Players · {league.counts.teams} Teams ·
							{league.counts.divisions} Divisions
						</p>
						{#if league.season}
							<a
								href={resolve('/leagues/[orgSlug]/[seasonSlug]', {
									orgSlug: league.slug,
									seasonSlug: league.season.slug,
								})}
								class="mt-4 inline-block text-sm font-semibold text-[#B8E05C] hover:underline"
							>
								View Stats →
							</a>
						{/if}
					</li>
				{/each}
			</ul>
		{/if}
	</section>

	{#if selected && leaders.players.length > 0}
		<section class="mt-14">
			<h2
				class="text-2xl font-bold"
				style="font-family: 'Barlow Condensed', system-ui, sans-serif"
			>
				Recent League Leaders
			</h2>
			<p class="mt-1 text-sm text-[#8FA398]">{selected.name}</p>
			<div class="mt-6 grid gap-4 sm:grid-cols-3">
				{#each [
					{ label: 'Points', player: topPts, value: topPts ? `${topPts.ppg} PPG` : '—' },
					{ label: 'Rebounds', player: topReb, value: topReb ? `${topReb.rpg} RPG` : '—' },
					{ label: 'Assists', player: topAst, value: topAst ? `${topAst.apg} APG` : '—' },
				] as card (card.label)}
					<div class="border border-white/10 bg-[#151D19] p-5 text-center">
						<p class="text-xs font-semibold tracking-wide text-[#8FA398] uppercase">
							{card.label}
						</p>
						<p class="mt-3 text-lg font-bold">{card.player?.name ?? '—'}</p>
						{#if card.player}
							<p class="mt-1 text-xs text-[#8FA398]">
								{card.player.teamName}
								{#if card.player.divisionName}
									· {card.player.divisionName}
								{/if}
							</p>
						{/if}
						<p class="mt-1 text-2xl font-extrabold tabular-nums text-[#B8E05C]">
							{card.value}
						</p>
					</div>
				{/each}
			</div>
		</section>
	{/if}
</div>
