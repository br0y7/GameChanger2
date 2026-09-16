<script lang="ts">
	import { getDivision } from '$lib/api/division.remote';
	import { getPlayer } from '$lib/api/player.remote';
	import { getSeason } from '$lib/api/season.remote';
	import { getTeam } from '$lib/api/team.remote';
	import type { PageProps } from './$types';
	import {
		getPlayerGameCount,
		getPlayerGameStats,
		getPlayerSeasonAverages,
	} from '$lib/api/player-game-stat.remote';
	import AnimatedNumber from '$lib/components/AnimatedNumber.svelte';
	import PlayerStatDataTable from './PlayerStatDataTable.svelte';
	import { columns } from './columns';
	import { analyzePlayer } from '$lib/api/player-analysis.remote';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { DRILLS_BY_WEAKNESS } from '$lib/player-analysis/drills-by-weakness';
	import DrillCard from './DrillCard.svelte';
	import { getOrganization } from '$lib/api/organization.remote';
	import { PUBLIC_APP_NAME } from '$env/static/public';
	import { askAiPanel } from '$lib/ai/ask-ai-state.svelte';
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';
	import { getStatDefinition } from '$lib/stats/stat-definitions';
	import { resolve } from '$app/paths';
	import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left';

	let { params }: PageProps = $props();

	const org = $derived(await getOrganization({ slug: params.orgSlug }));
	const season = $derived(await getSeason({ slug: params.seasonSlug, organizationId: org.id }));
	const division = $derived(await getDivision({ slug: params.divisionSlug, seasonId: season.id }));
	const team = $derived(await getTeam({ slug: params.teamSlug, divisionId: division.id }));
	const player = $derived(await getPlayer({ teamId: team.id, jerseyNumber: params.jerseyNumber }));

	const seasonAverages = $derived(await getPlayerSeasonAverages({ playerId: player.id }));
	const gameCount = $derived(await getPlayerGameCount({ playerId: player.id }));

	const numberFormatter = new Intl.NumberFormat('en', {
		style: 'decimal',
		maximumFractionDigits: 1,
	});

	const format = (n: number) => numberFormatter.format(n);

	const gameStats = $derived(await getPlayerGameStats({ playerId: player.id }));

	const percentFormatter = new Intl.NumberFormat('en', {
		style: 'percent',
		maximumFractionDigits: 0,
	});

	const formatPercent = (n: number) => percentFormatter.format(n);

	const averageCards = [
		{ title: 'Points', key: 'points', format },
		{ title: 'Rebounds', key: 'rebounds', format },
		{ title: 'Assists', key: 'assists', format },
		{ title: 'FG%', key: 'fgPct', format: formatPercent },
		{ title: '3P%', key: 'fg3Pct', format: formatPercent },
		{ title: 'FT%', key: 'ftPct', format: formatPercent },
	] as const;

	const detailAverages = [
		{ label: 'PTS', key: 'points' },
		{ label: 'REB', key: 'rebounds' },
		{ label: 'AST', key: 'assists' },
		{ label: 'STL', key: 'steals' },
		{ label: 'BLK', key: 'blocks' },
		{ label: 'TO', key: 'turnovers' },
		{ label: 'OREB', key: 'oreb' },
		{ label: 'DREB', key: 'dreb' },
		{ label: 'FGM', key: 'fgm' },
		{ label: 'FGA', key: 'fga' },
		{ label: '3PM', key: 'fg3m' },
		{ label: '3PA', key: 'fg3a' },
		{ label: 'FTM', key: 'ftm' },
		{ label: 'FTA', key: 'fta' },
		{ label: 'PF', key: 'pf' },
		{ label: 'EFF', key: 'eff' },
	] as const;

	const percentDetails = [
		{ label: 'FG%', key: 'fgPct' as const },
		{ label: '3P%', key: 'fg3Pct' as const },
		{ label: 'FT%', key: 'ftPct' as const },
	];

	const teamHref = $derived(
		resolve('/dashboard/[orgSlug]/seasons/[seasonSlug]/[divisionSlug]/[teamSlug]', {
			orgSlug: params.orgSlug,
			seasonSlug: params.seasonSlug,
			divisionSlug: params.divisionSlug,
			teamSlug: params.teamSlug,
		})
	);
</script>

<svelte:head>
	<title>{player.name} | {PUBLIC_APP_NAME}</title>
</svelte:head>

<div class="min-h-full bg-[#0D1117] text-[#E6EDF3]">
	<div class="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 sm:py-6">
		<a
			href={teamHref}
			class="mb-4 inline-flex items-center gap-1 text-sm text-[#8B949E] transition-colors hover:text-[#58A6FF]"
		>
			<ChevronLeftIcon class="size-4" />
			{team.name}
		</a>

		<header class="mb-6 rounded-2xl border border-[#2A3038] bg-[#161B22] p-5 sm:p-6">
			<p class="text-xs font-semibold tracking-wide text-[#8B949E] uppercase">
				Player Performance Report
			</p>
			<div class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
				<h1 class="text-2xl font-extrabold tracking-tight sm:text-3xl">
					#{player.jerseyNumber}
					{player.name}
				</h1>
				<button
					type="button"
					class="text-sm font-medium text-[#58A6FF] hover:underline"
					onclick={() => askAiPanel.openPanel(`Summarize ${player.name}'s season`)}
				>
					✦ Ask AI about this player
				</button>
			</div>
			<p class="mt-1 text-sm text-[#8B949E]">
				{team.name} · {season.name} · {division.name}
			</p>
			<p class="mt-2 text-sm text-[#E6EDF3]">
				{#if gameCount <= 0}
					No games played yet
				{:else if gameCount === 1}
					{gameCount} game played
				{:else}
					{gameCount} games played
				{/if}
			</p>
		</header>

		<div class="grid grid-cols-1 gap-5 xl:grid-cols-2">
			<section class="flex flex-col gap-4 rounded-2xl border border-[#2A3038] bg-[#161B22] p-5 sm:p-6">
				<h2 class="text-sm font-semibold tracking-wide text-[#8B949E] uppercase">Season Averages</h2>
				<div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
					<Tooltip.Provider delayDuration={200}>
						{#each averageCards as card (card.title)}
							<Tooltip.Root>
								<Tooltip.Trigger class="text-left">
									<div
										class="h-full cursor-help rounded-xl border border-[#2A3038] bg-[#0D1117] p-4"
									>
										<p class="text-xs font-medium tracking-wide text-[#8B949E] uppercase">
											{card.title}
										</p>
										<p class="mt-2 text-2xl font-bold tabular-nums text-[#E6EDF3]">
											<AnimatedNumber end={seasonAverages[card.key]} format={card.format} />
										</p>
									</div>
								</Tooltip.Trigger>
								<Tooltip.Content class="max-w-xs text-sm">
									{getStatDefinition(card.title)}
								</Tooltip.Content>
							</Tooltip.Root>
						{/each}
					</Tooltip.Provider>
				</div>

				<div class="overflow-hidden rounded-xl border border-[#2A3038]">
					<div class="border-b border-[#2A3038] bg-[#0D1117] px-4 py-2.5">
						<h3 class="text-xs font-semibold tracking-wide text-[#8B949E] uppercase">
							All season averages
						</h3>
					</div>
					<Tooltip.Provider delayDuration={200}>
						<div class="grid grid-cols-4 gap-px bg-[#2A3038] md:grid-cols-8">
							{#each detailAverages as stat (stat.label)}
								<Tooltip.Root>
									<Tooltip.Trigger
										class="flex cursor-help flex-col items-center gap-0.5 bg-[#161B22] px-2 py-3 text-center"
									>
										<span class="text-xs font-medium tracking-wide text-[#8B949E]">{stat.label}</span>
										<span class="text-base font-semibold tabular-nums text-[#E6EDF3]">
											{format(seasonAverages[stat.key])}
										</span>
									</Tooltip.Trigger>
									<Tooltip.Content class="max-w-xs text-sm">
										{getStatDefinition(stat.label)}
									</Tooltip.Content>
								</Tooltip.Root>
							{/each}
						</div>
						<div class="grid grid-cols-3 gap-px border-t border-[#2A3038] bg-[#2A3038]">
							{#each percentDetails as stat (stat.label)}
								<Tooltip.Root>
									<Tooltip.Trigger
										class="flex cursor-help flex-col items-center gap-0.5 bg-[#161B22] px-2 py-3 text-center"
									>
										<span class="text-xs font-medium tracking-wide text-[#8B949E]">{stat.label}</span>
										<span class="text-base font-semibold tabular-nums text-[#E6EDF3]">
											{formatPercent(seasonAverages[stat.key])}
										</span>
									</Tooltip.Trigger>
									<Tooltip.Content class="max-w-xs text-sm">
										{getStatDefinition(stat.label)}
									</Tooltip.Content>
								</Tooltip.Root>
							{/each}
						</div>
					</Tooltip.Provider>
				</div>
			</section>

			<section class="flex flex-col gap-4 rounded-2xl border border-[#2A3038] bg-[#161B22] p-5 sm:p-6">
				<h2 class="text-sm font-semibold tracking-wide text-[#8B949E] uppercase">Game Log</h2>
				<div class="overflow-x-auto text-[#E6EDF3]">
					<PlayerStatDataTable data={gameStats} {columns} />
				</div>
			</section>

			<section
				class="flex min-h-[25svh] flex-col gap-4 rounded-2xl border border-[#2A3038] bg-[#161B22] p-5 sm:p-6 xl:col-span-2"
			>
				<h2 class="text-sm font-semibold tracking-wide text-[#8B949E] uppercase">Analysis</h2>
				{#await analyzePlayer({ id: player.id })}
					<Skeleton class="h-32 w-full bg-[#0D1117]" />
				{:then playerAnalysis}
					{@const topStrength = playerAnalysis.strengths[0]}
					{@const [firstWeakness] = playerAnalysis.weaknesses}
					<p class="text-base text-[#E6EDF3]">
						Strength:
						<span class="font-bold">{topStrength?.description ?? 'Versatile player'}</span>
						{#if topStrength?.stat}
							<span class="font-medium text-[#8B949E]">
								· {topStrength.stat.display}
								{topStrength.stat.label}
							</span>
						{/if}
					</p>
					<div class="flex flex-col gap-4">
						<h3 class="text-base text-[#E6EDF3]">
							Area to improve:
							<span class="font-bold">{firstWeakness?.description ?? 'Consistency'}</span>
							{#if firstWeakness?.stat}
								<span class="font-medium text-[#8B949E]">
									· {firstWeakness.stat.display}
									{firstWeakness.stat.label}
								</span>
							{/if}
						</h3>
						{#if firstWeakness}
							<p class="text-sm font-medium text-[#8B949E]">Suggested drills</p>
							<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
								{#each DRILLS_BY_WEAKNESS[firstWeakness.category] as drill (drill.name)}
									<DrillCard {drill} />
								{/each}
							</div>
						{/if}
					</div>
				{/await}
			</section>
		</div>
	</div>
</div>
