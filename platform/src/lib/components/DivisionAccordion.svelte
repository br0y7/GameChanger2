<script lang="ts">
	import * as Accordion from '$lib/components/ui/accordion/index.js';
	import type { Division, Team } from '$lib/server/db/schema';
	import DivisionAccordionItem from './DivisionAccordionItem.svelte';
	import * as AlertDialog from '$lib/components/ui/alert-dialog/index.js';
	import type { Resource } from '$lib/forms/types';
	import { deleteTeam } from '$lib/api/team.remote';
	import { deleteDivision } from '$lib/api/division.remote';

	interface Props {
		orgSlug?: string;
		divisions: Division[];
		confirmDelete?: boolean;
	}

	let { divisions, confirmDelete, orgSlug }: Props = $props();

	interface SelectedDelete {
		target: { id: string; name: string };
		resource: Resource;
	}

	let selectedDelete: SelectedDelete | null = $state(null);
	let deleteDialogOpen = $state(false);

	const onRequestDelete = (target: Division | Team, resource: Resource) => {
		deleteDialogOpen = true;
		selectedDelete = { target, resource };
	};

	const deleteForm = $derived.by(() => {
		if (!selectedDelete) {
			return;
		}

		switch (selectedDelete.resource) {
			case 'team':
				return deleteTeam.for(selectedDelete.target.id);
			case 'division':
				return deleteDivision.for(selectedDelete.target.id);
		}
	});
</script>

<h2 class="text-center text-xl font-bold">Divisions</h2>
<Accordion.Root type="single">
	{#each divisions as division (division.id)}
		<DivisionAccordionItem {orgSlug} {division} {confirmDelete} {onRequestDelete} />
	{/each}
</Accordion.Root>

{#if selectedDelete && deleteForm}
	<AlertDialog.Root bind:open={deleteDialogOpen}>
		<AlertDialog.Content>
			<AlertDialog.Header>
				<AlertDialog.Title>Are you absolutely sure?</AlertDialog.Title>
				<AlertDialog.Description>
					This action cannot be undone. This will permanently delete the
					<span class="text-error">
						{selectedDelete.target.name}
					</span>
					{selectedDelete.resource}
					and its related data.
				</AlertDialog.Description>
			</AlertDialog.Header>
			<AlertDialog.Footer>
				<form
					{...deleteForm.enhance(async (form) => {
						deleteDialogOpen = false;
						await form.submit();
					})}
				>
					<input {...deleteForm.fields.id.as('hidden', selectedDelete.target.id)} />
					<AlertDialog.Cancel type="button">Cancel</AlertDialog.Cancel>
					<AlertDialog.Action variant="destructive" type="submit" disabled={!!deleteForm.pending}>
						Continue
					</AlertDialog.Action>
				</form>
			</AlertDialog.Footer>
		</AlertDialog.Content>
	</AlertDialog.Root>
{/if}
