<script lang="ts">
	import { resolve } from '$app/paths';
	import { PUBLIC_APP_NAME } from '$env/static/public';
	import {
		getPublicGames,
		getPublicLeagueMeta,
		getPublicSeasonFilters,
		listPublishedLeagues,
	} from '$lib/api/public-stats.remote';
	import { gameTypeLabel, isRegularSeasonGameType, resultOnlyOutcome } from '$lib/schemas/game';

	const leagues = $derived(await listPublishedLeagues());
	let orgSlug = $state('');
	let seasonSlug = $state('');
	let divisionSlug = $state('');

	const meta = $derived(orgSlug ? await getPublicLeagueMeta({ orgSlug }) : null);
	const seasonFilters = $derived(
		orgSlug && seasonSlug ? await getPublicSeasonFilters({ orgSlug, seasonSlug }) : null
	);

	const games = $derived(
		await getPublicGames({
			orgSlug: orgSlug || undefined,
			seasonSlug: seasonSlug || undefined,
			divisionSlug: divisionSlug || undefined,
			limit: 40,
		})
	);

	function formatDate(d: Date | null) {
		if (!d) return '';
		return new Date(d).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
		});
	}
</script>

<svelte:head>
	<title>Games | {PUBLIC_APP_NAME}</title>
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
		Games
	</h1>
	<p class="mt-3 text-[#A8B8AE]">Scores and schedules from leagues that publish game results.</p>

	<div class="mt-6 flex flex-wrap gap-3">
		<label class="text-sm text-[#8FA398]">
			League
			<select
				class="ml-2 rounded-md border border-white/15 bg-[#151D19] px-3 py-2 text-[#E8F0EA]"
				bind:value={orgSlug}
				onchange={() => {
					seasonSlug = leagues.find((league) => league.slug === orgSlug)?.season?.slug ?? '';
					divisionSlug = '';
				}}
			>
				<option value="">All leagues</option>
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
					<option value="">Latest season</option>
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

	{#if games.length === 0}
		<p class="mt-10 text-sm text-[#8FA398]">No published games yet.</p>
	{:else}
		<ul class="mt-8 space-y-3">
			{#each games as g (g.id)}
				<li
					class="flex flex-wrap items-baseline justify-between gap-2 border-b border-white/5 pb-3"
				>
					<div>
						<p class="text-sm font-medium text-[#E8F0EA]">
							{g.awayName}
							{#if g.status === 'completed' && g.statsAvailable === false && !g.pointsOnly}
								<span class="text-[#B8E05C]">
									{resultOnlyOutcome(
										g.defaultLossSide,
										false,
										g.awayScore,
										g.homeScore
									)}–{resultOnlyOutcome(g.defaultLossSide, true, g.homeScore, g.awayScore)}
								</span>
							{:else if g.status === 'completed' && g.awayScore != null && g.homeScore != null}
								<span class="text-[#B8E05C] tabular-nums"> {g.awayScore}–{g.homeScore} </span>
							{:else}
								<span class="text-[#8FA398]"> @ </span>
							{/if}
							{g.homeName}
						</p>
						<p class="mt-0.5 text-xs text-[#8FA398]">
							{g.leagueName} · {g.status}
							{#if !isRegularSeasonGameType(g.gameType)}
								· {gameTypeLabel(g.gameType)}
							{/if}
							{#if g.at}· {formatDate(g.at)}{/if}
						</p>
					</div>
					<a
						href={g.status === 'completed' && g.playerStatsPublic
							? resolve('/(public)/leagues/[orgSlug]/[seasonSlug]/games/[gameId]', {
									orgSlug: g.leagueSlug,
									seasonSlug: g.seasonSlug,
									gameId: g.id,
								})
							: resolve('/(public)/leagues/[orgSlug]/[seasonSlug]', {
									orgSlug: g.leagueSlug,
									seasonSlug: g.seasonSlug,
								})}
						class="text-xs font-semibold text-[#B8E05C] hover:underline"
					>
						{g.status === 'completed' && g.playerStatsPublic ? 'Box score →' : 'League →'}
					</a>
				</li>
			{/each}
		</ul>
	{/if}
</div>
