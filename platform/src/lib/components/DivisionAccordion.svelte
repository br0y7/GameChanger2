<script lang="ts">
	import * as Accordion from '$lib/components/ui/accordion/index.js';
	import type { Division, Team } from '$lib/server/db/schema';
	import DivisionAccordionItem from './DivisionAccordionItem.svelte';
	import * as AlertDialog from '$lib/components/ui/alert-dialog/index.js';
	import type { Resource } from '$lib/forms/types';
	import { deleteTeam } from '$lib/api/team.remote';
	import { deleteDivision, getDivisions, updateDivision } from '$lib/api/division.remote';
	import type { ActionVisibility } from './types';
	import { hasShallowChanges } from '$lib/utils/object';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import * as Field from '$lib/components/ui/field/index.js';
	import { toast } from 'svelte-sonner';
	import { focusFirstError } from '$lib/forms/enhance';
	import { divisionFormLabels } from '$lib/forms/labels';
	import NameSlugFields from '$lib/forms/NameSlugFields.svelte';
	import SelectField from './SelectField.svelte';
	import * as Select from '$lib/components/ui/select/index.js';
	import { divisionTypes } from '$lib/schemas/division';
	import FieldErrorList from './FieldErrorList.svelte';
	import ErrorAlert from './ErrorAlert.svelte';
	import { buttonVariants } from './ui/button';
	import SubmitButton from './SubmitButton.svelte';

	interface Props extends ActionVisibility {
		orgSlug?: string;
		seasonId: string;
		confirmDelete?: boolean;
	}

	let { seasonId, confirmDelete, orgSlug, canEdit, canDelete }: Props = $props();

	interface SelectedDelete {
		target: { id: string; name: string };
		resource: Resource;
	}

	const divisions = $derived(await getDivisions({ seasonId }));

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

	let selectedDivision: Division | undefined = $state();
	let updateDivisionOpen = $state(false);
	const updateForm = $derived(updateDivision.for(selectedDivision?.id ?? ''));
	let submitting = $derived(!!updateForm.pending);

	function onRequestEdit(division: Division) {
		selectedDivision = division;
		updateForm.fields.set(division);
		updateDivisionOpen = true;
	}

	const hasChanges = $derived(
		selectedDivision && hasShallowChanges(selectedDivision, updateForm.fields.value())
	);
</script>

<h2 class="text-center text-xl font-bold">Divisions</h2>
<Accordion.Root type="single">
	{#each divisions as division (division.id)}
		<DivisionAccordionItem
			{orgSlug}
			{division}
			{confirmDelete}
			{onRequestDelete}
			{onRequestEdit}
			{canEdit}
			{canDelete}
		/>
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

{#if selectedDivision}
	<Dialog.Root bind:open={updateDivisionOpen}>
		<Dialog.Content>
			<form
				{...updateForm.enhance(async (form) => {
					if (await form.submit()) {
						updateDivisionOpen = false;
						toast.success('Changes saved');
					}
				})}
				{@attach focusFirstError({
					submitting,
					issues: updateForm.fields.allIssues(),
				})}
				class="contents"
			>
				<input {...updateForm.fields.id.as('hidden', selectedDivision.id)} />
				<input {...updateForm.fields.seasonId.as('hidden', selectedDivision.seasonId)} />
				<Dialog.Header>
					<Dialog.Title>Edit {selectedDivision.name}</Dialog.Title>
					<Dialog.Description>
						Make changes to <span class="text-info">{selectedDivision.name}</span>.
						{#if hasChanges}
							Click save when you're done.
						{/if}
					</Dialog.Description>
				</Dialog.Header>
				<Field.Set disabled={submitting}>
					<Field.Group>
						<NameSlugFields
							labels={divisionFormLabels}
							remoteFields={{
								name: updateForm.fields.name,
								slug: updateForm.fields.slug,
							}}
							required
						/>
						<Field.Field orientation="horizontal">
							<SelectField label={divisionFormLabels.type} field={updateForm.fields.type} required>
								{#snippet trigger({ content, isPlaceholder })}
									<span class={{ capitalize: !isPlaceholder }}>{content}</span>
								{/snippet}
								{#each divisionTypes as type (type)}
									<Select.Item value={type} class="capitalize">{type}</Select.Item>
								{/each}
							</SelectField>
						</Field.Field>
						<FieldErrorList errors={updateForm.fields.type.issues()} />
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
