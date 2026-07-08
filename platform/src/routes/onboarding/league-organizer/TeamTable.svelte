<script lang="ts">
	import type { Team } from '$lib/server/db/schema';
	import * as Table from '$lib/components/ui/table';
	import { teamFormLabels } from '$lib/forms/labels';
	import TeamTableRow from './TeamTableRow.svelte';

	interface Props {
		teams: Team[];
	}

	let { teams }: Props = $props();
</script>

<Table.Root class="table-fixed w-full">
	<Table.Header>
		<Table.Row>
			<Table.Head class="w-3/7">{teamFormLabels.name}</Table.Head>
			<Table.Head class="w-3/7">{teamFormLabels.slug}</Table.Head>
			<Table.Head class="w-1/7 text-end" />
		</Table.Row>
	</Table.Header>
	<Table.Body>
		{#each teams as team (team.id)}
			<TeamTableRow {team} />
		{/each}
	</Table.Body>
</Table.Root>
