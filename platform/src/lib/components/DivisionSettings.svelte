<script lang="ts">
	import { deleteDivision } from '$lib/api/division.remote';
	import SubmitButton from '$lib/components/SubmitButton.svelte';
	import { Button } from '$lib/components/ui/button';
	import type { Division } from '$lib/server/db/schema';
	import TrashIcon from '@lucide/svelte/icons/trash-2';
	import PencilIcon from '@lucide/svelte/icons/pencil-line';
	import { fade } from 'svelte/transition';
	import type { ActionVisibility } from './types';

	interface Props extends ActionVisibility {
		division: Division;
		submitting?: boolean;
		confirmDelete?: boolean;
		onRequestDelete?: (division: Division) => void;
		onRequestEdit?: (division: Division) => void;
	}

	let {
		division,
		submitting = $bindable(false),
		confirmDelete,
		onRequestDelete,
		canEdit,
		canDelete,
		onRequestEdit,
	}: Props = $props();
</script>

<div in:fade={{ duration: 200 }} class="flex items-center justify-between">
	<span>
		Slug: {division.slug}
	</span>
	<div class="flex">
		{#if canEdit}
			<Button
				onclick={() => onRequestEdit?.(division)}
				class="group"
				variant="ghost"
				aria-label={`Edit ${division.name}`}
			>
				<PencilIcon class="transition-colors duration-200 group-hover:stroke-info" />
				<span class="transition-colors duration-200 group-hover:text-info"> Edit </span>
			</Button>
		{/if}
		{#snippet deleteButton()}
			<SubmitButton
				class="group"
				variant="ghost"
				{submitting}
				aria-label={`Delete ${division.name}`}
				onclick={() => {
					if (confirmDelete) {
						onRequestDelete?.(division);
					}
				}}
			>
				{#snippet icon()}
					<TrashIcon class="transition-colors duration-200 group-hover:stroke-destructive" />
				{/snippet}
				<span class="transition-colors duration-200 group-hover:text-destructive"> Delete </span>
			</SubmitButton>
		{/snippet}
		{#if confirmDelete && canDelete}
			{@render deleteButton()}
		{:else if canDelete}
			<form {...deleteDivision.for(division.id)}>
				<input {...deleteDivision.for(division.id).fields.id.as('hidden', division.id)} />
				{@render deleteButton()}
			</form>
		{/if}
	</div>
</div>
