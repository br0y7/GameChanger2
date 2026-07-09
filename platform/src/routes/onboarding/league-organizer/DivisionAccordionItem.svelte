<script lang="ts">
	import ExpandTransition from '$lib/components/transitions/ExpandTransition.svelte';
	import * as Accordion from '$lib/components/ui/accordion/index.js';
	import type { Division } from '$lib/server/db/schema';
	import AddTeamForm from './AddTeamForm.svelte';
	import TeamTable from './TeamTable.svelte';
	import DivisionSettings from './DivisionSettings.svelte';

	interface Props {
		division: Division;
	}

	let { division }: Props = $props();
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
		<Accordion.Content class="flex flex-col gap-4">
			<DivisionSettings {division} />
			<h3 class="text-lg text-center">Teams for {division.name}</h3>
			<AddTeamForm divisionId={division.id} />
			<TeamTable divisionId={division.id} />
		</Accordion.Content>
	</Accordion.Item>
</ExpandTransition>
