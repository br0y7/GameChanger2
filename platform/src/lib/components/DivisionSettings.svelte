<script lang="ts">
	import { deleteDivision, updateDivision } from '$lib/api/division.remote';
	import SelectField from '$lib/components/SelectField.svelte';
	import SlugField from '$lib/components/SlugField.svelte';
	import SubmitButton from '$lib/components/SubmitButton.svelte';
	import ExpandTransition from '$lib/components/transitions/ExpandTransition.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Field from '$lib/components/ui/field/index.js';
	import { Input } from '$lib/components/ui/input';
	import * as Select from '$lib/components/ui/select/index.js';
	import { focusFirstError } from '$lib/forms/enhance';
	import { divisionFormLabels } from '$lib/forms/labels';
	import { divisionTypes } from '$lib/schemas/division';
	import type { Division } from '$lib/server/db/schema';
	import TrashIcon from '@lucide/svelte/icons/trash-2';
	import PencilIcon from '@lucide/svelte/icons/pencil-line';
	import CloseIcon from '@lucide/svelte/icons/x';
	import CheckIcon from '@lucide/svelte/icons/check';
	import { tick } from 'svelte';
	import { fade } from 'svelte/transition';

	interface Props {
		division: Division;
		submitting?: boolean;
		confirmDelete?: boolean;
		onRequestDelete?: (division: Division) => void;
	}

	let { division, submitting = $bindable(false), confirmDelete, onRequestDelete }: Props = $props();

	let editing = $state(false);

	const updateForm = $derived(updateDivision.for(division.id));
	let updateFormElement: HTMLFormElement | null = $state(null);
	let nameInput: HTMLInputElement | null = $state(null);

	async function startEditing() {
		editing = true;
		updateForm.fields.set(division);

		await tick();

		nameInput?.focus();
	}

	async function stopEditing() {
		updateFormElement?.reset();

		await tick(); // prevents derived_inert

		editing = false;
	}

	const enhancedUpdateForm = $derived(
		updateForm.enhance(async (form) => {
			if (await form.submit()) {
				stopEditing();
			}
		})
	);
</script>

{#if editing}
	<ExpandTransition class="w-full">
		<form
			{@attach focusFirstError({
				submitting,
				issues: updateForm.fields.allIssues(),
			})}
			{...enhancedUpdateForm}
			bind:this={updateFormElement}
		>
			<input {...updateForm.fields.id.as('hidden', division.id)} />
			<input {...updateForm.fields.seasonId.as('hidden', division.seasonId)} />
			<Field.Set disabled={submitting} class="flex flex-col gap-4">
				<Field.Group class="grid sm:grid-cols-3 gap-1 gap-y-2">
					<Field.Field class="sm:col-span-2 w-full px-0.5">
						<Field.Label for="division-name">{divisionFormLabels.name}</Field.Label>
						<Input
							id="division-name"
							{...updateForm.fields.name.as('text')}
							required
							bind:ref={nameInput}
						/>
					</Field.Field>
					<Field.Field class="w-full px-1">
						<SelectField
							label="Type"
							placeholder="Select a type"
							field={updateForm.fields.type}
							required
						>
							{#snippet trigger({ content, isPlaceholder })}
								<span class={{ capitalize: !isPlaceholder }}>{content}</span>
							{/snippet}
							{#each divisionTypes as type (type)}
								<Select.Item value={type} class="capitalize">{type}</Select.Item>
							{/each}
						</SelectField>
					</Field.Field>
					<Field.Field class="sm:col-span-2 w-full px-0.5">
						<SlugField
							id="division-slug"
							source={updateForm.fields.name.value() ?? ''}
							remoteField={updateForm.fields.slug}
							label={divisionFormLabels.slug}
						/>
					</Field.Field>
					<Field.Field class="mt-auto flex justify-end" orientation="horizontal">
						<div class="flex">
							<Button
								onclick={stopEditing}
								variant="ghost"
								class="group w-auto"
								aria-label="Cancel edit"
							>
								<CloseIcon
									class="stroke-muted-foreground group-hover:stroke-foreground transition-colors duration-200"
								/>
								<span
									class="text-muted-foreground group-hover:text-foreground transition-colors duration-200"
								>
									Cancel
								</span>
							</Button>
							<SubmitButton
								{submitting}
								variant="outline"
								class="group w-auto"
								aria-label="Save changes"
							>
								{#snippet icon()}
									<CheckIcon
										class="group-hover:stroke-success group-hover:scale-140 transition-all duration-200"
									/>
								{/snippet}
								<span
									class="group-hover:text-success group-hover:scale-105 transition-all duration-200"
								>
									Save
								</span>
							</SubmitButton>
						</div>
					</Field.Field>
				</Field.Group>
			</Field.Set>
		</form>
	</ExpandTransition>
{:else}
	<div in:fade={{ duration: 200 }} class="flex items-center justify-between">
		<span>
			Slug: {division.slug}
		</span>
		<div class="flex">
			<Button
				onclick={startEditing}
				class="group"
				variant="ghost"
				aria-label={`Edit ${division.name}`}
			>
				<PencilIcon class="group-hover:stroke-info transition-colors duration-200" />
				<span class="group-hover:text-info transition-colors duration-200"> Edit </span>
			</Button>
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
						<TrashIcon class="group-hover:stroke-destructive transition-colors duration-200" />
					{/snippet}
					<span class="group-hover:text-destructive transition-colors duration-200"> Delete </span>
				</SubmitButton>
			{/snippet}
			{#if confirmDelete}
				{@render deleteButton()}
			{:else}
				<form {...deleteDivision.for(division.id)}>
					<input {...deleteDivision.for(division.id).fields.id.as('hidden', division.id)} />
					{@render deleteButton()}
				</form>
			{/if}
		</div>
	</div>
{/if}
