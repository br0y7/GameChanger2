<script lang="ts">
	import * as Table from '$lib/components/ui/table';
	import { teamFormLabels } from '$lib/forms/labels';
	import TeamTableRow from './TeamTableRow.svelte';
	import { getTeams } from '$lib/api/team.remote';
	import ExpandTransition from '$lib/components/transitions/ExpandTransition.svelte';
	import type { Team } from '$lib/server/db/schema';
	import type { ActionVisibility } from './types';

	interface Props extends ActionVisibility {
		orgSlug?: string;
		divisionId: string;
		confirmDelete?: boolean;
		onRequestDelete?: (team: Team) => void;
	}

	let { orgSlug, divisionId, confirmDelete, onRequestDelete, canEdit, canDelete }: Props = $props();
	const teams = $derived(await getTeams({ divisionId }));
</script>

{#if teams.length > 0}
	<ExpandTransition>
		<Table.Root class="w-full">
			<Table.Header>
				<Table.Row>
					<Table.Head class="w-1/2">{teamFormLabels.name}</Table.Head>
					<Table.Head class="w-1/2">{teamFormLabels.slug}</Table.Head>
					{#if canEdit || canDelete}
						<Table.Head class="w-20 text-end" />
					{/if}
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each teams as team (team.id)}
					<TeamTableRow {orgSlug} {team} {confirmDelete} {onRequestDelete} {canEdit} {canDelete} />
				{/each}
			</Table.Body>
		</Table.Root>
	</ExpandTransition>
{:else}
	<ExpandTransition class="text-center">No teams yet...</ExpandTransition>
{/if}
