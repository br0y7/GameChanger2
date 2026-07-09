<script lang="ts">
	import * as Table from '$lib/components/ui/table';
	import { teamFormLabels } from '$lib/forms/labels';
	import TeamTableRow from './TeamTableRow.svelte';
	import { getTeams } from '$lib/api/team.remote';
	import Collapsible from '$lib/components/Collapsible.svelte';

	interface Props {
		divisionId: string;
	}

	let { divisionId }: Props = $props();
	const teams = $derived(await getTeams({ divisionId }));
</script>

<Collapsible isOpen={teams.length > 0}>
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
</Collapsible>
