<script lang="ts">
	import type { Player } from '$lib/server/db/schema';
	import * as Table from '$lib/components/ui/table';
	import { slide } from 'svelte/transition';
	import { createAccessibleTransition } from '$lib/accessibility.svelte';
	import SubmitButton from '$lib/components/SubmitButton.svelte';
	import { createEnhanceHandler } from '$lib/forms/enhance';
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import TrashIcon from '@lucide/svelte/icons/trash-2';
	import SendIcon from '@lucide/svelte/icons/send';

	interface Props {
		player: Player;
		submitting?: boolean;
	}

	let { player, submitting = $bindable(false) }: Props = $props();

	const accessibleSlide = createAccessibleTransition(slide);
	const cellSlideOptions = { duration: 200 };

	const handleCompletion = createEnhanceHandler({
		onStart: () => (submitting = true),
		onEnd: () => (submitting = false),
	});
</script>

<Table.Row>
	<Table.Cell class="font-medium">
		<div transition:accessibleSlide={cellSlideOptions}>
			{player.name}
		</div>
	</Table.Cell>
	<Table.Cell class="text-center">
		<div transition:accessibleSlide={cellSlideOptions}>
			{player.jerseyNumber || 'N/A'}
		</div>
	</Table.Cell>
	<Table.Cell class="text-end">
		<div transition:accessibleSlide={cellSlideOptions} class="flex gap-1">
			<Button class="group" variant="outline">
				<SendIcon class="group-hover:stroke-info transition-colors duration-200" />
				<span class="group-hover:text-info transition-colors duration-200"> Invite </span>
			</Button>
			<form action="?/deletePlayer" method="post" use:enhance={handleCompletion}>
				<input type="hidden" name="id" value={player.id} />
				<SubmitButton class="group" variant="outline" size="icon" {submitting}>
					{#snippet icon()}
						<TrashIcon class="group-hover:stroke-destructive transition-colors duration-200" />
					{/snippet}
				</SubmitButton>
			</form>
		</div>
	</Table.Cell>
</Table.Row>
