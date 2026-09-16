<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { PUBLIC_APP_NAME } from '$env/static/public';
	import {
		getPublicGames,
		getPublicPlayerLeaders,
		getPublicSeasonFilters,
		getPublicStandings,
		getPublicTeamStats,
	} from '$lib/api/public-stats.remote';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();

	const filters = $derived(
		await getPublicSeasonFilters({
			orgSlug: params.orgSlug,
			seasonSlug: params.seasonSlug,
		})
	);

	type Tab = 'players' | 'teams' | 'standings' | 'games';
	let tab = $state<Tab>('players');
	let divisionSlug = $state('');
	let teamSlug = $state('');

	$effect(() => {
		const q = page.url.searchParams;
		const t = q.get('tab');
		if (t === 'teams' || t === 'standings' || t === 'games' || t === 'players') tab = t;
		divisionSlug = q.get('division') ?? '';
		teamSlug = q.get('team') ?? '';
	});

	const leaders = $derived(
		await getPublicPlayerLeaders({
			orgSlug: params.orgSlug,
			seasonSlug: params.seasonSlug,
			divisionSlug: divisionSlug || undefined,
			teamSlug: teamSlug || undefined,
			limit: 50,
		})
	);

	const standings = $derived(
		await getPublicStandings({
			orgSlug: params.orgSlug,
			seasonSlug: params.seasonSlug,
			divisionSlug: divisionSlug || undefined,
		})
	);

	const teamStats = $derived(
		await getPublicTeamStats({
			orgSlug: params.orgSlug,
			seasonSlug: params.seasonSlug,
			divisionSlug: divisionSlug || undefined,
		})
	);

	const games = $derived(
		await getPublicGames({
			orgSlug: params.orgSlug,
			seasonSlug: params.seasonSlug,
			limit: 30,
		})
	);

	const divisionTeams = $derived(
		divisionSlug
			? (filters.divisions.find((d) => d.slug === divisionSlug)?.teams ?? [])
			: filters.divisions.flatMap((d) => d.teams)
	);

	const tabs: { id: Tab; label: string }[] = [
		{ id: 'players', label: 'Player Leaders' },
		{ id: 'teams', label: 'Team Stats' },
		{ id: 'standings', label: 'Standings' },
		{ id: 'games', label: 'Game Results' },
	];

	function formatDate(d: Date | null) {
		if (!d) return '';
		return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	}

	function hrefFor(next: { tab?: Tab; division?: string; team?: string }) {
		const sp = new URLSearchParams();
		const t = next.tab ?? tab;
		if (t !== 'players') sp.set('tab', t);
		const div = next.division !== undefined ? next.division : divisionSlug;
		const team = next.team !== undefined ? next.team : teamSlug;
		if (div) sp.set('division', div);
		if (team) sp.set('team', team);
		const q = sp.toString();
		const base = resolve('/leagues/[orgSlug]/[seasonSlug]', {
			orgSlug: params.orgSlug,
			seasonSlug: params.seasonSlug,
		});
		return q ? `${base}?${q}` : base;
	}
</script>

<svelte:head>
	<title>{filters.league.name} Stats | {PUBLIC_APP_NAME}</title>
</svelte:head>

<div class="mx-auto max-w-6xl px-4 py-10 sm:px-6" style="font-family: Figtree, system-ui, sans-serif">
	<a href={resolve('/leagues')} class="text-sm text-[#8FA398] hover:text-[#B8E05C]">← Leagues</a>
	<p class="mt-4 text-xs font-semibold tracking-[0.18em] text-[#8FA398] uppercase">
		{filters.league.name}
	</p>
	<h1
		class="mt-1 text-4xl font-bold tracking-tight text-[#E8F0EA]"
		style="font-family: 'Barlow Condensed', system-ui, sans-serif"
	>
		{filters.season.name}
	</h1>
	<p class="mt-2 text-sm text-[#8FA398]">
		Public performance stats only — development reports stay private.
	</p>

	<div class="mt-6 flex flex-wrap gap-3">
		<label class="text-sm text-[#8FA398]">
			Division
			<select
				class="ml-2 rounded-md border border-white/15 bg-[#0C1210] px-2 py-1.5 text-[#E8F0EA]"
				value={divisionSlug}
				onchange={(e) => {
					divisionSlug = e.currentTarget.value;
					teamSlug = '';
					history.replaceState({}, '', hrefFor({ division: divisionSlug, team: '' }));
				}}
			>
				<option value="">All divisions</option>
				{#each filters.divisions as d (d.id)}
					<option value={d.slug}>{d.name}</option>
				{/each}
			</select>
		</label>
		{#if tab === 'players'}
			<label class="text-sm text-[#8FA398]">
				Team
				<select
					class="ml-2 rounded-md border border-white/15 bg-[#0C1210] px-2 py-1.5 text-[#E8F0EA]"
					value={teamSlug}
					onchange={(e) => {
						teamSlug = e.currentTarget.value;
						history.replaceState({}, '', hrefFor({ team: teamSlug }));
					}}
				>
					<option value="">All teams</option>
					{#each divisionTeams as t (t.id)}
						<option value={t.slug}>{t.name}</option>
					{/each}
				</select>
			</label>
		{/if}
	</div>

	<nav class="mt-8 flex gap-4 overflow-x-auto border-b border-white/10" aria-label="Stats views">
		{#each tabs as item (item.id)}
			<button
				type="button"
				class="shrink-0 border-b-2 pb-3 text-sm font-medium transition-colors {tab === item.id
					? 'border-[#B8E05C] text-[#B8E05C]'
					: 'border-transparent text-[#8FA398] hover:text-[#E8F0EA]'}"
				onclick={() => {
					tab = item.id;
					history.replaceState({}, '', hrefFor({ tab: item.id }));
				}}
			>
				{item.label}
			</button>
		{/each}
	</nav>

	<div class="mt-8">
		{#if tab === 'players'}
			{#if !filters.visibility.publishPlayerStats}
				<p class="text-sm text-[#8FA398]">This league has not published player stats.</p>
			{:else if leaders.players.length === 0}
				<p class="text-sm text-[#8FA398]">No player stats recorded yet.</p>
			{:else}
				<div class="overflow-x-auto">
					<table class="w-full min-w-[560px] text-left text-sm">
						<thead class="border-b border-white/10 text-xs text-[#8FA398] uppercase">
							<tr>
								<th class="pb-2 font-semibold">Player</th>
								<th class="pb-2 font-semibold">Team</th>
								<th class="pb-2 font-semibold">Division</th>
								<th class="pb-2 font-semibold tabular-nums">GP</th>
								<th class="pb-2 font-semibold tabular-nums">PPG</th>
								<th class="pb-2 font-semibold tabular-nums">RPG</th>
								<th class="pb-2 font-semibold tabular-nums">APG</th>
								<th class="pb-2 font-semibold tabular-nums">SPG</th>
							</tr>
						</thead>
						<tbody>
							{#each leaders.players as p (p.playerId)}
								<tr class="border-b border-white/5">
									<td class="py-2.5 font-medium">{p.name}</td>
									<td class="py-2.5 text-[#8FA398]">{p.teamName}</td>
									<td class="py-2.5 text-[#8FA398]">{p.divisionName}</td>
									<td class="py-2.5 tabular-nums">{p.gp}</td>
									<td class="py-2.5 tabular-nums font-semibold text-[#B8E05C]">{p.ppg}</td>
									<td class="py-2.5 tabular-nums">{p.rpg}</td>
									<td class="py-2.5 tabular-nums">{p.apg}</td>
									<td class="py-2.5 tabular-nums">{p.spg}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		{:else if tab === 'teams'}
			{#if !filters.visibility.publishTeamStats}
				<p class="text-sm text-[#8FA398]">This league has not published team stats.</p>
			{:else if teamStats.teams.length === 0}
				<p class="text-sm text-[#8FA398]">No team stats yet.</p>
			{:else}
				<div class="overflow-x-auto">
					<table class="w-full min-w-[480px] text-left text-sm">
						<thead class="border-b border-white/10 text-xs text-[#8FA398] uppercase">
							<tr>
								<th class="pb-2 font-semibold">Team</th>
								<th class="pb-2 font-semibold">Division</th>
								<th class="pb-2 font-semibold tabular-nums">GP</th>
								<th class="pb-2 font-semibold tabular-nums">PPG</th>
								<th class="pb-2 font-semibold tabular-nums">OPP</th>
								<th class="pb-2 font-semibold tabular-nums">DIFF</th>
							</tr>
						</thead>
						<tbody>
							{#each teamStats.teams as t (t.teamId)}
								<tr class="border-b border-white/5">
									<td class="py-2.5 font-medium">{t.name}</td>
									<td class="py-2.5 text-[#8FA398]">{t.divisionName}</td>
									<td class="py-2.5 tabular-nums">{t.gp}</td>
									<td class="py-2.5 tabular-nums font-semibold text-[#B8E05C]">{t.ppg}</td>
									<td class="py-2.5 tabular-nums">{t.oppPpg}</td>
									<td class="py-2.5 tabular-nums">{t.diff}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		{:else if tab === 'standings'}
			{#if !filters.visibility.publishStandings}
				<p class="text-sm text-[#8FA398]">This league has not published standings.</p>
			{:else if standings.divisions.length === 0}
				<p class="text-sm text-[#8FA398]">No standings yet.</p>
			{:else}
				{#each standings.divisions as div (div.id)}
					<section class="mb-8">
						<h2 class="text-sm font-semibold tracking-wide text-[#8FA398] uppercase">
							{div.name}
						</h2>
						<ul class="mt-3 space-y-2">
							{#each div.rows as row, i (row.teamId)}
								<li class="flex justify-between border-b border-white/5 py-2 text-sm">
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
			{/if}
		{:else}
			{#if !filters.visibility.publishGameScores}
				<p class="text-sm text-[#8FA398]">This league has not published game scores.</p>
			{:else if games.length === 0}
				<p class="text-sm text-[#8FA398]">No games yet.</p>
			{:else}
				<ul class="space-y-3">
					{#each games as g (g.id)}
						<li class="border-b border-white/5 pb-3 text-sm">
							<p class="font-medium">
								{g.awayName}
								{#if g.status === 'completed' && g.awayScore != null && g.homeScore != null}
									<span class="tabular-nums text-[#B8E05C]">
										{g.awayScore}–{g.homeScore}
									</span>
								{:else}
									<span class="text-[#8FA398]"> @ </span>
								{/if}
								{g.homeName}
							</p>
							<p class="mt-0.5 text-xs text-[#8FA398]">
								{g.status}
								{#if g.at}· {formatDate(g.at)}{/if}
							</p>
						</li>
					{/each}
				</ul>
			{/if}
		{/if}
	</div>
</div>
