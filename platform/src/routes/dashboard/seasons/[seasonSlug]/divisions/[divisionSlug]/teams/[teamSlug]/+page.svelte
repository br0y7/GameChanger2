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

	let { params }: PageProps = $props();

	const org = $derived(await getOrganization());
	const season = $derived(await getSeason({ slug: params.seasonSlug, organizationId: org.id }));
	const division = $derived(await getDivision({ slug: params.divisionSlug, seasonId: season.id }));
	const team = $derived(
		await getTeam({ slug: params.teamSlug, divisionId: division.id, include: { players: true } })
	);
</script>

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
		<Table.Root>
			<Table.Header>
				<Table.Row>
					<Table.Head>Player Name</Table.Head>
					<Table.Head class="max-w-4 text-center">Jersey Number</Table.Head>
					<Table.Head class="max-w-4 text-center"># of Games</Table.Head>
					<!-- Optionally add options here if user is a Coach -->
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each team.players as player (player.id)}
					<Table.Row>
						<Table.Cell class="font-medium">
							<a
								href={resolve(
									'/dashboard/seasons/[seasonSlug]/divisions/[divisionSlug]/teams/[teamSlug]/players/[jerseyNumber]',
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
