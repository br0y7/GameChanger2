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
	import { Spinner } from '$lib/components/ui/spinner';

	let { params }: PageProps = $props();

	const season = $derived(await getSeason({ slug: params.seasonSlug }));
	const division = $derived(await getDivision({ slug: params.divisionSlug, seasonId: season.id }));
	const team = $derived(await getTeam({ slug: params.teamSlug, divisionId: division.id }));
	const player = $derived(await getPlayer({ teamId: team.id, jerseyNumber: params.jerseyNumber }));

	const seasonAveragesPromise = $derived(getPlayerSeasonAverages({ playerId: player.id }));
	const gameCount = $derived(await getPlayerGameCount({ playerId: player.id }));

	const numberFormatter = new Intl.NumberFormat('en', {
		style: 'decimal',
		maximumFractionDigits: 1,
	});

	const format = (n: number) => numberFormatter.format(n);

	const gameStats = $derived(await getPlayerGameStats({ playerId: player.id }));

	type AverageData = {
		title: string;
		key: keyof Awaited<typeof seasonAveragesPromise>;
		format: (n: number) => string;
	};
</script>

<div class="grid grid-cols-1 xl:grid-cols-2 gap-6 p-8">
	<section class="xl:col-span-2 text-center">
		<h1 class="text-3xl font-extrabold">Player Performance Report</h1>
		<h2 class="text-2xl font-bold">{player.name} of team {team.name}</h2>
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
		<div class="grid grid-cols-1 sm:grid-cols-4 gap-4">
			{#await seasonAveragesPromise}
				{#each ['Points', 'Assists', 'Turnovers', 'Shooting %'] as title (title)}
					<Card.Root>
						<Card.Header>
							<Card.Title>{title}</Card.Title>
						</Card.Header>
						<Card.Content>
							<Spinner />
						</Card.Content>
					</Card.Root>
				{/each}
			{:then seasonAverages}
				{let averagesData: AverageData[] = [
					{
						title: 'Points',
						key: 'points',
						format,
					},
					{
						title: 'Assists',
						key: 'assists',
						format,
					},
					{
						title: 'Turnovers',
						key: 'turnovers',
						format,
					},
					{
						title: 'Shooting %',
						key: 'shootingPercentage',
						format: (p: number) => `${format(p * 100)}%`,
					},
				]}
				{#each averagesData as data (data.key)}
					<Card.Root>
						<Card.Header>
							<Card.Title>{data.title}</Card.Title>
						</Card.Header>
						<Card.Content class="text-2xl">
							<AnimatedNumber end={seasonAverages[data.key]} format={data.format} />
						</Card.Content>
					</Card.Root>
				{/each}
			{/await}
		</div>
		<Separator />
	</section>

	<section class="flex flex-col gap-4">
		<h3 class="text-xl font-bold">Box Scores</h3>
		<PlayerStatDataTable data={gameStats} {columns} />
		<Separator />
	</section>

	<section>
		<h3 class="text-xl font-bold">Analysis</h3>
	</section>
</div>
