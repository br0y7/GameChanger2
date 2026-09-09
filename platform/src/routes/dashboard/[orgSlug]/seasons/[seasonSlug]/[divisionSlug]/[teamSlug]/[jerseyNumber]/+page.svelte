<script lang="ts">
	import { getDivision } from '$lib/api/division.remote';
	import { getPlayer } from '$lib/api/player.remote';
	import { getSeason } from '$lib/api/season.remote';
	import { getTeam } from '$lib/api/team.remote';
	import { Separator } from '$lib/components/ui/separator';
	import type { PageProps } from './$types';
	import * as Card from '$lib/components/ui/card/index.js';
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
</script>

<svelte:head>
	<title>{player.name} | {PUBLIC_APP_NAME}</title>
</svelte:head>

<div class="grid grid-cols-1 gap-6 px-8 pb-8 xl:grid-cols-2 xl:grid-rows-2">
	<section class="text-center xl:col-span-2">
		<h1 class="text-3xl font-extrabold">Player Performance Report</h1>
		<h2 class="text-2xl font-bold">{player.name} of team {team.name}</h2>
		<button
			type="button"
			class="mt-2 text-sm font-medium text-[#58A6FF] hover:underline"
			onclick={() => askAiPanel.openPanel(`Summarize ${player.name}'s season`)}
		>
			✦ Ask AI about this player
		</button>
	</section>

	<Separator class="xl:col-span-2" />

	<section class="flex flex-col justify-center gap-4">
		<h3 class="text-xl font-bold">Season Averages</h3>
		<p>
			{#if gameCount <= 0}
				No games played yet
			{:else if gameCount === 1}
				<span class="font-medium">{gameCount} game played</span>
			{:else}
				<span class="font-medium">{gameCount} games played</span>
			{/if}
		</p>
		<div class="grid grid-cols-2 gap-4 sm:grid-cols-3">
			{#each averageCards as card (card.title)}
				<Card.Root>
					<Card.Header>
						<Card.Title>{card.title}</Card.Title>
					</Card.Header>
					<Card.Content class="text-2xl tabular-nums">
						<AnimatedNumber end={seasonAverages[card.key]} format={card.format} />
					</Card.Content>
				</Card.Root>
			{/each}
		</div>
		<Separator />
	</section>

	<section class="flex flex-col gap-4">
		<h3 class="text-xl font-bold">Box Scores</h3>
		<PlayerStatDataTable data={gameStats} {columns} />
		<Separator />
	</section>

	<section class="flex min-h-[25svh] flex-col gap-4 xl:col-start-2 xl:row-span-2 xl:row-start-3">
		<h2 class="text-2xl font-bold xl:col-span-2">Analysis</h2>
		{#await analyzePlayer({ id: player.id })}
			<Skeleton class="h-full w-full" />
		{:then playerAnalysis}
			{@const topStrength = playerAnalysis.strengths[0]}
			{@const [firstWeakness] = playerAnalysis.weaknesses}
			<p class="text-xl">
				Strength:
				<span class="font-bold">
					{topStrength?.description ?? 'Versatile player'}
				</span>
				{#if topStrength?.stat}
					<span class="text-muted-foreground font-medium">
						· {topStrength.stat.display}
						{topStrength.stat.label}
					</span>
				{/if}
			</p>
			<section class="flex flex-col gap-4">
				<h3 class="text-xl">
					Area to improve:
					<span class="font-bold">
						{firstWeakness?.description ?? 'Consistency'}
					</span>
					{#if firstWeakness?.stat}
						<span class="text-muted-foreground font-medium">
							· {firstWeakness.stat.display}
							{firstWeakness.stat.label}
						</span>
					{/if}
				</h3>
				{#if firstWeakness}
					<p class="text-xl font-medium">Suggested drills:</p>
					<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
						{#each DRILLS_BY_WEAKNESS[firstWeakness.category] as drill (drill.name)}
							<DrillCard {drill} />
						{/each}
					</div>
				{/if}
			</section>
		{/await}
	</section>
</div>
