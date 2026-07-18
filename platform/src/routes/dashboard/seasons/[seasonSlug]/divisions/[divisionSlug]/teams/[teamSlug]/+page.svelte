<script lang="ts">
	import { getDivision } from '$lib/api/division.remote';
	import { getSeason } from '$lib/api/season.remote';
	import { getTeam } from '$lib/api/team.remote';
	import type { PageProps } from './$types';
	import * as Table from '$lib/components/ui/table/index.js';
	import { Separator } from '$lib/components/ui/separator';
	import { resolve } from '$app/paths';

	let { params }: PageProps = $props();

	const season = $derived(await getSeason({ slug: params.seasonSlug }));
	const division = $derived(await getDivision({ slug: params.divisionSlug, seasonId: season.id }));
	const team = $derived(
		await getTeam({ slug: params.teamSlug, divisionId: division.id, include: { players: true } })
	);
</script>

<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 p-8">
	<section class="lg:col-span-2 text-center">
		<h1 class="text-3xl font-extrabold">{team.name}</h1>
	</section>

	<Separator class="lg:col-span-2" />

	<section>
		<Table.Root>
			<Table.Header>
				<Table.Row>
					<Table.Head>Player Name</Table.Head>
					<Table.Head>Jersey Number</Table.Head>
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
						<Table.Cell>{player.jerseyNumber}</Table.Cell>
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
	</section>
</div>
