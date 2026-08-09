<script lang="ts">
	import ExpandTransition from '$lib/components/transitions/ExpandTransition.svelte';
	import * as Accordion from '$lib/components/ui/accordion/index.js';
	import type { Division, Team } from '$lib/server/db/schema';
	import TeamTable from './TeamTable.svelte';
	import DivisionSettings from './DivisionSettings.svelte';
	import AddTeamForm from '$lib/forms/AddTeamForm.svelte';
	import type { Resource } from '$lib/forms/types';
	import type { ActionVisibility } from './types';

	interface Props extends ActionVisibility {
		orgSlug?: string;
		division: Division;
		confirmDelete?: boolean;
		onRequestDelete?: (target: Division | Team, resource: Resource) => void;
		onRequestEdit?: (division: Division) => void;
	}

	let {
		division,
		confirmDelete,
		onRequestDelete,
		orgSlug,
		canEdit,
		canDelete,
		onRequestEdit,
	}: Props = $props();
</script>

<ExpandTransition class="not-last:border-b">
	<Accordion.Item value={division.id}>
		<Accordion.Trigger>
			<h3 class="text-lg">
				{division.name}
			</h3>
			<span class="my-auto ml-2 text-sm text-muted-foreground capitalize">
				{division.type}
			</span>
		</Accordion.Trigger>
		<Accordion.Content class="flex flex-col gap-6">
			<DivisionSettings
				{division}
				{confirmDelete}
				onRequestDelete={(div) => onRequestDelete?.(div, 'division')}
				{onRequestEdit}
				{canEdit}
				{canDelete}
			/>
			<h3 class="text-center text-lg">Teams for {division.name}</h3>
			{#if canEdit}
				<AddTeamForm divisionId={division.id} />
			{/if}
			<TeamTable
				{orgSlug}
				divisionId={division.id}
				{confirmDelete}
				onRequestDelete={(team) => onRequestDelete?.(team, 'team')}
				{canEdit}
				{canDelete}
			/>
		</Accordion.Content>
	</Accordion.Item>
</ExpandTransition>
