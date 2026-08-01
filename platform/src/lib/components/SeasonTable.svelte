<script lang="ts">
	import { deleteSeason, getSeasons } from '$lib/api/season.remote';
	import * as Table from '$lib/components/ui/table/index.js';
	import type { Season } from '$lib/server/db/schema';
	import SeasonTableRow from './SeasonTableRow.svelte';
	import ExpandTransition from './transitions/ExpandTransition.svelte';
	import * as AlertDialog from '$lib/components/ui/alert-dialog/index.js';

	interface Props {
		organizationId: string;
	}

	let { organizationId }: Props = $props();

	const seasons = $derived(await getSeasons({ organizationId }));

	let selected: Season | undefined = $state();
	function onDelete(season: Season) {
		confirmDeleteOpen = true;
		selected = season;
	}

	let confirmDeleteOpen = $state(false);
</script>

{#if seasons.length > 0}
	<ExpandTransition>
		<form {...deleteSeason}>
			<input {...deleteSeason.fields.id.as('hidden', '')} />
		</form>
		<Table.Root class="table-fixed w-full">
			<Table.Header>
				<Table.Row>
					<Table.Head>Name</Table.Head>
					<Table.Head>Slug</Table.Head>
					<Table.Head class="w-16">Status</Table.Head>
					<Table.Head class="w-36"></Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each seasons as season (season.id)}
					<SeasonTableRow {season} {onDelete} />
				{/each}
			</Table.Body>
		</Table.Root>
	</ExpandTransition>

	{#if selected}
		<AlertDialog.Root bind:open={confirmDeleteOpen}>
			<AlertDialog.Content>
				<AlertDialog.Header>
					<AlertDialog.Title>Are you absolutely sure?</AlertDialog.Title>
					<AlertDialog.Description>
						This action cannot be undone. This will permanently delete
						<span class="font-bold text-error">
							{selected.name}
						</span>
						and remove its related data.
					</AlertDialog.Description>
				</AlertDialog.Header>
				<AlertDialog.Footer>
					<form
						{...deleteSeason.for(selected.id).enhance(async (form) => {
							confirmDeleteOpen = false;
							await form.submit();
						})}
					>
						<input {...deleteSeason.for(selected.id).fields.id.as('hidden', selected.id)} />
						<AlertDialog.Cancel type="button">Cancel</AlertDialog.Cancel>
						<AlertDialog.Action
							variant="destructive"
							type="submit"
							disabled={!!deleteSeason.for(selected.id).pending}
						>
							Continue
						</AlertDialog.Action>
					</form>
				</AlertDialog.Footer>
			</AlertDialog.Content>
		</AlertDialog.Root>
	{/if}
{/if}
