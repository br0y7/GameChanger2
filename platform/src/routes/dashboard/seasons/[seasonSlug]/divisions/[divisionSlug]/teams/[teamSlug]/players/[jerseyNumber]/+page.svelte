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

	let { params }: PageProps = $props();

	const season = $derived(await getSeason({ slug: params.seasonSlug }));
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
</script>

<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 p-8">
	<section class="lg:col-span-2 text-center">
		<h1 class="text-3xl font-extrabold">Player Performance Report</h1>
		<h2 class="text-2xl font-bold">{player.name} of team {team.name}</h2>
	</section>

	<Separator class="lg:col-span-2" />

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
			<Card.Root>
				<Card.Header>
					<Card.Title>Points</Card.Title>
				</Card.Header>
				<Card.Content class="text-2xl">
					<AnimatedNumber end={seasonAverages.points} {format} />
				</Card.Content>
			</Card.Root>
			<Card.Root>
				<Card.Header>
					<Card.Title>Assists</Card.Title>
				</Card.Header>
				<Card.Content class="text-2xl">
					<AnimatedNumber end={seasonAverages.assists} {format} />
				</Card.Content>
			</Card.Root>
			<Card.Root>
				<Card.Header>
					<Card.Title>Turnovers</Card.Title>
				</Card.Header>
				<Card.Content class="text-2xl">
					<AnimatedNumber end={seasonAverages.turnovers} {format} />
				</Card.Content>
			</Card.Root>
			<Card.Root>
				<Card.Header>
					<Card.Title>Shooting %</Card.Title>
				</Card.Header>
				<Card.Content class="text-2xl">
					<AnimatedNumber
						end={seasonAverages.shootingPercentage * 100}
						format={(p) => `${format(p)}%`}
					/>
				</Card.Content>
			</Card.Root>
		</div>
	</section>

	<Separator class="lg:col-span-2" />

	<section>
		<h3 class="text-xl font-bold">Box Scores</h3>
		<PlayerStatDataTable data={gameStats} {columns} />
	</section>

	<Separator class="lg:col-span-2" />

	<section>
		<h3 class="text-xl font-bold">Analysis</h3>
	</section>
</div>
