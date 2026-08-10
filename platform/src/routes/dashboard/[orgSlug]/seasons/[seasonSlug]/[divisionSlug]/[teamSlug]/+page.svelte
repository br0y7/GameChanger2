<script lang="ts">
	import { getDivision } from '$lib/api/division.remote';
	import { getSeason } from '$lib/api/season.remote';
	import { getTeam } from '$lib/api/team.remote';
	import type { PageProps } from './$types';
	import * as Table from '$lib/components/ui/table/index.js';
	import { Separator } from '$lib/components/ui/separator';
	import { resolve } from '$app/paths';
	import { getPlayerGameCount } from '$lib/api/player-game-stat.remote';
	import { getOrganization } from '$lib/api/organization.remote';
	import { PUBLIC_APP_NAME } from '$env/static/public';

	let { params }: PageProps = $props();

	const org = $derived(await getOrganization({ slug: params.orgSlug }));
	const season = $derived(await getSeason({ slug: params.seasonSlug, organizationId: org.id }));
	const division = $derived(await getDivision({ slug: params.divisionSlug, seasonId: season.id }));
	const team = $derived(
		await getTeam({ slug: params.teamSlug, divisionId: division.id, include: { players: true } })
	);
</script>

<svelte:head>
	<title>{division.name} - {team.name} | {PUBLIC_APP_NAME}</title>
</svelte:head>

<div class="grid grid-cols-1 gap-6 p-8 lg:grid-cols-2">
	<section class="text-center lg:col-span-2">
		<h1 class="text-3xl font-extrabold">
			{!team.name.toLowerCase().includes('team') ? 'Team' : ''}
			{team.name}
		</h1>
		<h2 class="text-xl text-muted-foreground">{division.name}</h2>
	</section>

	<Separator class="lg:col-span-2" />

	<section>
		<Table.Root class="w-full table-fixed">
			<Table.Header>
				<Table.Row>
					<Table.Head>Player Name</Table.Head>
					<Table.Head class="w-24 text-center">Jersey #</Table.Head>
					<Table.Head class="w-28 text-center">Games Played</Table.Head>
					<!-- Optionally add options here if user is a Coach -->
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each team.players as player (player.id)}
					<Table.Row>
						<Table.Cell class="truncate font-medium">
							<a
								href={resolve(
									'/dashboard/[orgSlug]/seasons/[seasonSlug]/[divisionSlug]/[teamSlug]/[jerseyNumber]',
									{
										...params,
										teamSlug: team.slug,
										jerseyNumber: player.jerseyNumber ?? '',
									}
								)}
								class="underline"
							>
								{player.name}
							</a>
						</Table.Cell>
						<Table.Cell class="text-center">{player.jerseyNumber}</Table.Cell>
						<Table.Cell class="text-center">
							{#await getPlayerGameCount({ playerId: player.id }) then count}
								{count}
							{/await}
						</Table.Cell>
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
	</section>
</div>
