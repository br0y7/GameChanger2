<script lang="ts">
	import { resolve } from '$app/paths';
	import { PUBLIC_APP_NAME } from '$env/static/public';
	import {
		getPublicLeagueMeta,
		getPublicSeasonFilters,
		getPublicTeamStats,
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

	const meta = $derived(orgSlug ? await getPublicLeagueMeta({ orgSlug }) : null);
	const seasonFilters = $derived(
		orgSlug && seasonSlug ? await getPublicSeasonFilters({ orgSlug, seasonSlug }) : null
	);
	const teamStats = $derived(
		orgSlug && seasonSlug
			? await getPublicTeamStats({
					orgSlug,
					seasonSlug,
					divisionSlug: divisionSlug || undefined,
				})
			: { teams: [] }
	);

	function teamHref(teamSlug: string, division: string) {
		const q = new URLSearchParams({ tab: 'players', team: teamSlug });
		if (division) q.set('division', division);
		return resolve(`/(public)/leagues/[orgSlug]/[seasonSlug]?${q}`, {
			orgSlug,
			seasonSlug,
		});
	}
</script>

<svelte:head>
	<title>Teams | {PUBLIC_APP_NAME}</title>
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
		Teams
	</h1>
	<p class="mt-3 text-[#A8B8AE]">Rosters and scoring from leagues that publish team stats.</p>

	{#if leagues.length === 0}
		<p class="mt-10 text-sm text-[#8FA398]">No published leagues yet.</p>
	{:else}
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

		{#if teamStats.teams.length === 0}
			<p class="mt-10 text-sm text-[#8FA398]">No teams to show for this filter.</p>
		{:else}
			<ul class="mt-8 divide-y divide-white/10 border-y border-white/10">
				{#each teamStats.teams as team (team.teamId)}
					<li class="flex flex-wrap items-baseline justify-between gap-3 py-4">
						<div>
							<a
								href={teamHref(team.slug, team.divisionSlug)}
								class="text-lg font-semibold text-[#E8F0EA] hover:text-[#B8E05C] hover:underline"
							>
								{team.name}
							</a>
							<p class="mt-1 text-sm text-[#8FA398]">{team.divisionName}</p>
						</div>
						<p class="text-sm text-[#A8B8AE] tabular-nums">
							{team.gp} GP · <span class="font-semibold text-[#B8E05C]">{team.ppg} PPG</span>
						</p>
					</li>
				{/each}
			</ul>
		{/if}
	{/if}
</div>
