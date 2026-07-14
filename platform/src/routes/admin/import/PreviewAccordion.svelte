<script lang="ts">
	import * as Accordion from '$lib/components/ui/accordion/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';

	import {
		statKeys,
		type PlayerGameStatsPreview,
		type ReconciliationStatus,
		type SpreadsheetPreview,
		type TeamPreview,
	} from '$lib/schemas/preview';
	interface Props {
		preview: SpreadsheetPreview;
	}

	let { preview }: Props = $props();

	function getBadgeColor(status: ReconciliationStatus) {
		switch (status) {
			case 'new':
				return 'info';
			case 'update':
				return 'warning';
		}
	}
</script>

{#snippet statsTable(playerStats: PlayerGameStatsPreview[])}
	<Table.Root>
		<Table.Header>
			<Table.Row>
				<Table.Head>Jersey #</Table.Head>
				{#each statKeys as key (key)}
					<Table.Head class="uppercase">{key}</Table.Head>
				{/each}
			</Table.Row>
		</Table.Header>
		<Table.Body>
			{#each playerStats as stat (stat.jerseyNumber)}
				<Table.Row>
					<Table.Cell class="flex gap-2">
						{stat.jerseyNumber}
						<Badge class={`bg-${getBadgeColor(stat._status)}`}>
							{stat._status}
						</Badge>
					</Table.Cell>
					{#each statKeys as key (key)}
						<Table.Cell>{stat.stats[key]}</Table.Cell>
					{/each}
				</Table.Row>
			{/each}
		</Table.Body>
	</Table.Root>
{/snippet}

{#snippet teamAccordion(team: TeamPreview)}
	<Accordion.Root type="single" class="w-[98%]">
		<Accordion.Item value={`team-${team.name}`}>
			<Accordion.Trigger class="flex gap-2">
				{team.name}
				<Badge class={`bg-${getBadgeColor(team._status)}`}>
					{team._status}
				</Badge>
			</Accordion.Trigger>
			<Accordion.Content>
				{@render statsTable(team.playerStats)}
			</Accordion.Content>
		</Accordion.Item>
	</Accordion.Root>
{/snippet}

<Accordion.Root type="single" class="w-[98%]">
	{#each preview.games as game (game.name)}
		<Accordion.Item value={game.name + game.completedAt}>
			<Accordion.Trigger>
				{game.name}
			</Accordion.Trigger>
			<Accordion.Content>
				<p class="text-md">{game.completedAt}</p>
				{@render teamAccordion(game.homeTeam)}
				{@render teamAccordion(game.awayTeam)}
			</Accordion.Content>
		</Accordion.Item>
	{/each}
</Accordion.Root>
