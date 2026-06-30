<script lang="ts">
	import type { Player } from '$lib/server/db/schema';
	import * as Table from '$lib/components/ui/table';
	import PlayerTableRow from './PlayerTableRow.svelte';
	import type { FormStateProp } from '$lib/forms/types';
	import type { UpdatePlayerFormSchema } from '$lib/schemas/player';

	interface Props {
		players: Player[];
		form: FormStateProp<UpdatePlayerFormSchema>;
	}

	let { players, form }: Props = $props();
</script>

<Table.Root>
	<Table.Header>
		<Table.Row>
			<Table.Head class="w-full">Player Name</Table.Head>
			<Table.Head class="text-center">Jersey #</Table.Head>
			<Table.Head class="text-end" />
		</Table.Row>
	</Table.Header>
	<Table.Body>
		{#each players as player (player.id)}
			<PlayerTableRow {player} {form} />
		{/each}
	</Table.Body>
</Table.Root>
