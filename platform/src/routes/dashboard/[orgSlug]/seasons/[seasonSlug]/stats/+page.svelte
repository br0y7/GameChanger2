<script lang="ts">
	import { PUBLIC_APP_NAME } from '$env/static/public';
	import { resolve } from '$app/paths';
	import { getOrganization } from '$lib/api/organization.remote';
	import { getSeason, getSeasonStats } from '$lib/api/season.remote';
	import { getSeasonTeams, getSeasonGames } from '$lib/api/league-manage.remote';
	import AnimatedNumber from '$lib/components/AnimatedNumber.svelte';
	import type { PageProps } from './$types';
	import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left';

	let { params }: PageProps = $props();

	const org = $derived(await getOrganization({ slug: params.orgSlug }));
	const season = $derived(await getSeason({ slug: params.seasonSlug, organizationId: org.id }));
	const stats = $derived(await getSeasonStats({ seasonId: season.id }));
	const teams = $derived(await getSeasonTeams({ seasonId: season.id }));
	const games = $derived(await getSeasonGames({ seasonId: season.id }));

	type HubTab = 'Overview' | 'Teams' | 'Schedule';
	let activeTab = $state<HubTab>('Overview');

	const numberFormatter = new Intl.NumberFormat('en', {
		style: 'decimal',
		maximumFractionDigits: 0,
	});
	const format = (n: number) => numberFormatter.format(n);

	const formatDate = (date: Date | null | undefined) => {
		if (!date) return 'TBD';
		return new Date(date).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
		});
	};

	const gameTypeLabel = (type: string | null | undefined) => {
		if (type === 'playoff') return 'Playoff';
		if (type === 'finals') return 'Finals';
		return 'Regular Season';
	};

	const byDivision = $derived(
		teams.reduce(
			(acc, team) => {
				const key = team.divisionName;
				if (!acc[key]) acc[key] = [];
				acc[key].push(team);
				return acc;
			},
			{} as Record<string, typeof teams>
		)
	);

	const adminHref = $derived(resolve('/dashboard/[orgSlug]', { orgSlug: params.orgSlug }));

	function teamHref(team: (typeof teams)[number]) {
		return resolve(
			'/dashboard/[orgSlug]/seasons/[seasonSlug]/[divisionSlug]/[teamSlug]',
			{
				orgSlug: params.orgSlug,
				seasonSlug: params.seasonSlug,
				divisionSlug: team.divisionSlug,
				teamSlug: team.slug,
			}
		);
	}

	function boxHref(gameId: string) {
		return resolve('/dashboard/[orgSlug]/seasons/[seasonSlug]/games/[gameId]', {
			orgSlug: params.orgSlug,
			seasonSlug: params.seasonSlug,
			gameId,
		});
	}

	const glance = $derived([
		{ label: 'Games', value: stats.gameCount },
		{ label: 'Teams', value: stats.teamCount },
		{ label: 'Players', value: stats.playerCount },
		{ label: 'Divisions', value: stats.divisionCount },
	]);
</script>

<svelte:head>
	<title>{season.name} Stats | {PUBLIC_APP_NAME}</title>
</svelte:head>

<div class="min-h-full bg-[#0D1117] text-[#E6EDF3]">
	<div class="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-6">
		<a
			href={adminHref}
			class="inline-flex items-center gap-1 text-sm text-[#8B949E] transition-colors hover:text-[#58A6FF]"
		>
			<ChevronLeftIcon class="size-4" />
			Admin Dashboard
		</a>

		<header class="rounded-2xl border border-[#2A3038] bg-[#161B22] p-5 sm:p-6">
			<p class="text-xs font-semibold tracking-wide text-[#8B949E] uppercase">Stats</p>
			<h1 class="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{season.name}</h1>
			<p class="mt-1 text-sm text-[#8B949E]">{org.name}</p>
		</header>

		<div class="flex gap-1 border-b border-[#2A3038]">
			{#each ['Overview', 'Teams', 'Schedule'] as tab (tab)}
				<button
					type="button"
					class="px-4 py-2.5 text-sm font-medium transition-colors {activeTab === tab
						? 'border-b-2 border-[#58A6FF] text-[#E6EDF3]'
						: 'text-[#8B949E] hover:text-[#E6EDF3]'}"
					onclick={() => (activeTab = tab as HubTab)}
				>
					{tab}
				</button>
			{/each}
		</div>

		{#if activeTab === 'Overview'}
			<section class="grid grid-cols-2 gap-3 sm:grid-cols-4">
				{#each glance as card (card.label)}
					<div class="rounded-2xl border border-[#2A3038] bg-[#161B22] p-4">
						<p class="text-xs font-semibold tracking-wide text-[#8B949E] uppercase">{card.label}</p>
						<p class="mt-2 text-2xl font-bold tabular-nums">
							<AnimatedNumber end={card.value} {format} />
						</p>
					</div>
				{/each}
			</section>
			<p class="text-sm text-[#8B949E]">
				Browse teams and the schedule below, or open a team page for standings and leaders.
			</p>
		{:else if activeTab === 'Teams'}
			{#if teams.length === 0}
				<p class="text-sm text-[#8B949E]">No teams in this season yet.</p>
			{:else}
				{#each Object.entries(byDivision) as [divisionName, divisionTeams] (divisionName)}
					<section class="space-y-2">
						<h2 class="text-sm font-semibold tracking-wide text-[#8B949E] uppercase">
							{divisionName}
						</h2>
						<div class="grid gap-2 sm:grid-cols-2">
							{#each divisionTeams as team (team.id)}
								<a
									href={teamHref(team)}
									class="rounded-2xl border border-[#2A3038] bg-[#161B22] p-4 transition-colors hover:border-[#58A6FF]"
								>
									<p class="font-semibold">{team.name}</p>
									<p class="mt-1 text-xs text-[#8B949E]">{team.playerCount} players</p>
								</a>
							{/each}
						</div>
					</section>
				{/each}
			{/if}
		{:else}
			{#if games.length === 0}
				<p class="text-sm text-[#8B949E]">No games scheduled yet.</p>
			{:else}
				<ul class="divide-y divide-[#2A3038] overflow-hidden rounded-2xl border border-[#2A3038] bg-[#161B22]">
					{#each games as game (game.id)}
						<li>
							<a
								href={boxHref(game.id)}
								class="flex flex-col gap-1 px-4 py-3 transition-colors hover:bg-[#1C2128] sm:flex-row sm:items-center sm:justify-between"
							>
								<div class="min-w-0">
									<p class="font-medium">
										{game.awayTeam.name}
										<span class="text-[#8B949E]">@</span>
										{game.homeTeam.name}
									</p>
									<p class="text-xs text-[#8B949E]">
										{formatDate(game.completedAt ?? game.scheduledAt)} · {gameTypeLabel(game.gameType)}
									</p>
								</div>
								<p class="shrink-0 font-semibold tabular-nums">
									{game.awayTeamScore}–{game.homeTeamScore}
								</p>
							</a>
						</li>
					{/each}
				</ul>
			{/if}
		{/if}
	</div>
</div>
