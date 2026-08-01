<script lang="ts">
	import type { Player } from '$lib/server/db/schema';
	import * as Table from '$lib/components/ui/table';
	import PlayerTableRow from './PlayerTableRow.svelte';

	interface Props {
		players: Player[];
	}

	let { players }: Props = $props();
</script>

<Table.Root>
	<Table.Header>
		<Table.Row>
			<Table.Head class="w-3/5">Player Name</Table.Head>
			<Table.Head class="w-1/5 text-center">Jersey #</Table.Head>
			<Table.Head class="w-1/5" />
		</Table.Row>
	</Table.Header>
	<Table.Body>
		{#each players as player (player.id)}
			<PlayerTableRow {player} />
		{/each}
	</Table.Body>
</Table.Root>
