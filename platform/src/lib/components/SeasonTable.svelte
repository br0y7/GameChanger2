<script lang="ts">
	import { deleteSeason, getSeasons, updateSeason } from '$lib/api/season.remote';
	import * as Table from '$lib/components/ui/table/index.js';
	import type { Organization, Season } from '$lib/server/db/schema';
	import SeasonTableRow from './SeasonTableRow.svelte';
	import ExpandTransition from './transitions/ExpandTransition.svelte';
	import * as AlertDialog from '$lib/components/ui/alert-dialog/index.js';
	import type { ActionVisibility } from './types';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { buttonVariants } from './ui/button';
	import SubmitButton from './SubmitButton.svelte';
	import * as Field from '$lib/components/ui/field/index.js';
	import NameSlugFields from '$lib/forms/NameSlugFields.svelte';
	import { seasonFormLabels } from '$lib/forms/labels';
	import SelectField from './SelectField.svelte';
	import ErrorAlert from './ErrorAlert.svelte';
	import FieldErrorList from './FieldErrorList.svelte';
	import { seasonStatuses } from '$lib/schemas/season';
	import * as Select from '$lib/components/ui/select/index.js';
	import { focusFirstError } from '$lib/forms/enhance';
	import { toast } from 'svelte-sonner';
	import { hasShallowChanges } from '$lib/utils/object';

	interface Props extends ActionVisibility {
		org: Organization;
	}

	let { org, canEdit, canDelete }: Props = $props();

	const seasons = $derived(await getSeasons({ organizationId: org.id }));

	let selected: Season | undefined = $state();

	let confirmDeleteOpen = $state(false);
	function onDelete(season: Season) {
		confirmDeleteOpen = true;
		selected = season;
	}

	let submitting = $derived(!!updateSeason.pending);
	let updateDialogOpen = $state(false);
	const updateForm = $derived(updateSeason.for(selected?.id ?? ''));

	function onRequestEdit(season: Season) {
		selected = season;
		updateForm.fields.set(season);
		updateDialogOpen = true;
	}

	const hasChanges = $derived(selected && hasShallowChanges(selected, updateForm.fields.value()));
</script>

{#if seasons.length > 0}
	<ExpandTransition>
		{#if canDelete}
			<form {...deleteSeason}>
				<input {...deleteSeason.fields.id.as('hidden', '')} />
			</form>
		{/if}
		<Table.Root>
			<Table.Header>
				<Table.Row>
					<Table.Head class="w-1/2">Name</Table.Head>
					<Table.Head class="hidden w-1/2 sm:table-cell">Slug</Table.Head>
					<Table.Head class="w-20">Status</Table.Head>
					{#if canEdit || canDelete}
						<Table.Head class="w-24" />
					{/if}
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each seasons as season (season.id)}
					<SeasonTableRow
						orgSlug={org.slug}
						{season}
						{canEdit}
						{canDelete}
						{onDelete}
						{onRequestEdit}
					/>
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
						class="contents"
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

		<Dialog.Root bind:open={updateDialogOpen}>
			<Dialog.Content>
				<form
					{...updateForm.enhance(async (form) => {
						if (await form.submit()) {
							updateDialogOpen = false;
							toast.success('Changes saved');
						}
					})}
					{@attach focusFirstError({
						submitting,
						issues: updateForm.fields.allIssues(),
					})}
					class="contents"
				>
					<Dialog.Header>
						<Dialog.Title>Edit {selected.name}</Dialog.Title>
						<Dialog.Description>
							Make changes to <span class="text-info">{selected.name}</span>.
							{#if hasChanges}
								Click save when you're done.
							{/if}
						</Dialog.Description>
					</Dialog.Header>
					<Field.Set disabled={submitting}>
						<Field.Group>
							<NameSlugFields
								labels={seasonFormLabels}
								remoteFields={{
									name: updateForm.fields.name,
									slug: updateForm.fields.slug,
								}}
								required
							/>
							<Field.Field orientation="horizontal">
								<SelectField
									label={seasonFormLabels.status}
									field={updateForm.fields.status}
									placeholder="Select status"
									required
								>
									{#snippet trigger({ content, isPlaceholder })}
										<span class={{ capitalize: !isPlaceholder }}>{content}</span>
									{/snippet}
									{#each seasonStatuses as status (status)}
										<Select.Item value={status} class="capitalize">{status}</Select.Item>
									{/each}
								</SelectField>
							</Field.Field>
							<FieldErrorList errors={updateForm.fields.status.issues()} />
							<ErrorAlert errors={updateForm.fields.issues()} />
						</Field.Group>
					</Field.Set>
					<Dialog.Footer class="grid grid-cols-2">
						<Dialog.Close type="button" class={buttonVariants({ variant: 'outline' })}>
							Cancel
						</Dialog.Close>
						<SubmitButton {submitting} disabled={!hasChanges}>Save Changes</SubmitButton>
					</Dialog.Footer>
				</form>
			</Dialog.Content>
		</Dialog.Root>
	{/if}
{/if}
