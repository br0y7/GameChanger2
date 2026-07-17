<script lang="ts">
	import * as Table from '$lib/components/ui/table';
	import { teamFormLabels } from '$lib/forms/labels';
	import TeamTableRow from './TeamTableRow.svelte';
	import { getTeams } from '$lib/api/team.remote';
	import ExpandTransition from '$lib/components/transitions/ExpandTransition.svelte';
	import type { Team } from '$lib/server/db/schema';

	interface Props {
		divisionId: string;
		confirmDelete?: boolean;
		onRequestDelete?: (team: Team) => void;
	}

	let { divisionId, confirmDelete, onRequestDelete }: Props = $props();
	const teams = $derived(await getTeams({ divisionId }));
</script>

{#if teams.length > 0}
	<ExpandTransition>
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
					<TeamTableRow {team} {confirmDelete} {onRequestDelete} />
				{/each}
			</Table.Body>
		</Table.Root>
	</ExpandTransition>
{/if}
