<script lang="ts">
	import type { Team } from '$lib/server/db/schema';
	import * as Table from '$lib/components/ui/table';
	import { fade } from 'svelte/transition';
	import SubmitButton from '$lib/components/SubmitButton.svelte';
	import { focusFirstError } from '$lib/forms/enhance';
	import { Button } from '$lib/components/ui/button';
	import TrashIcon from '@lucide/svelte/icons/trash-2';
	import PencilIcon from '@lucide/svelte/icons/pencil-line';
	import CloseIcon from '@lucide/svelte/icons/x';
	import CheckIcon from '@lucide/svelte/icons/check';
	import { Input } from '$lib/components/ui/input';
	import { tick } from 'svelte';
	import { cubicOut } from 'svelte/easing';
	import { deleteTeam, updateTeam } from '$lib/api/team.remote';
	import ExpandTransition from '$lib/components/transitions/ExpandTransition.svelte';
	import type { NameSlugSchema } from '$lib/schemas/common';
	import FieldErrorTooltip from '$lib/components/FieldErrorTooltip.svelte';
	import SlugField from '$lib/components/SlugField.svelte';
	import ErrorPopover from '$lib/components/ErrorPopover.svelte';
	import { resolve } from '$app/paths';
	import { getDivision } from '$lib/api/division.remote';

	interface Props {
		team: Team;
		confirmDelete?: boolean;
		onRequestDelete?: (team: Team) => void;
	}

	let { team, confirmDelete, onRequestDelete }: Props = $props();

	const fadeOptions = { duration: 200, easing: cubicOut };

	let updateButton: HTMLButtonElement | null = $state(null);

	const updateFormId = () => `team-form-${team.id}`;

	let inputs: Record<keyof NameSlugSchema, HTMLInputElement | null> = $state({
		name: null,
		slug: null,
	});

	let updateForm = $derived(updateTeam.for(team.id));

	const submitting = $derived(!!updateForm.pending);

	let editing = $state(false);

	async function startEditing() {
		editing = true;

		const { name, slug } = team;
		updateForm.fields.set({ id: team.id, name, slug: slug ?? '' });

		await tick();

		inputs.name?.focus();
	}

	let updateFormElement: HTMLFormElement | null = $state(null);

	function stopEditing() {
		updateFormElement?.reset();
		editing = false;
	}

	let enhancedUpdateForm = $derived(
		updateForm.enhance(async (form) => {
			if (await form.submit()) {
				stopEditing();
			}
		})
	);

	const division = $derived(await getDivision({ id: team.divisionId, include: { season: true } }));
</script>

<Table.Row
	{@attach focusFirstError({
		submitting,
		issues: updateForm.fields.allIssues(),
	})}
>
	<Table.Cell class="font-medium">
		<ExpandTransition>
			{#if editing}
				<div in:fade={fadeOptions}>
					<FieldErrorTooltip remoteField={updateForm.fields.name} anchor={inputs.name}>
						<Input
							required
							form={updateFormId()}
							bind:ref={inputs.name}
							{...updateForm.fields.name.as('text', team.name)}
							oninput={(e) => {
								// name.value() won't update, maybe the input event
								// is attached on the form element, which this
								// input is not inside in
								updateForm.fields.name.set(e.currentTarget.value);
							}}
							autocomplete="off"
						/>
					</FieldErrorTooltip>
				</div>
			{:else}
				<div in:fade={fadeOptions}>
					<a
						href={resolve(
							'/dashboard/seasons/[seasonSlug]/divisions/[divisionSlug]/teams/[teamSlug]',
							{
								seasonSlug: division.season?.slug ?? '',
								divisionSlug: division.slug,
								teamSlug: team.slug,
							}
						)}
						class="underline"
					>
						{team.name}
					</a>
				</div>
			{/if}
		</ExpandTransition>
	</Table.Cell>
	<Table.Cell>
		<ExpandTransition>
			{#if editing}
				<div in:fade={fadeOptions}>
					<FieldErrorTooltip remoteField={updateForm.fields.slug} anchor={inputs.slug}>
						<SlugField
							remoteField={updateForm.fields.slug}
							source={updateForm.fields.name.value() ?? ''}
							ref={inputs.slug}
							form={updateFormId()}
							required
						/>
					</FieldErrorTooltip>
				</div>
			{:else}
				<div in:fade={fadeOptions}>
					{team.slug}
				</div>
			{/if}
		</ExpandTransition>
	</Table.Cell>
	<Table.Cell>
		<ExpandTransition>
			{#if editing}
				<div in:fade={fadeOptions} class="flex justify-end">
					<Button
						disabled={submitting}
						onclick={stopEditing}
						class="group"
						variant="ghost"
						size="icon"
						aria-label="Cancel edit"
					>
						<CloseIcon
							class="stroke-muted-foreground group-hover:stroke-foreground transition-colors duration-200"
						/>
					</Button>
					<form {...enhancedUpdateForm} id={updateFormId()} bind:this={updateFormElement}>
						<input {...updateForm.fields.id.as('hidden', team.id)} />
						<input {...updateForm.fields.divisionId.as('hidden', team.divisionId)} />

						<SubmitButton
							bind:ref={updateButton}
							class="group"
							variant="ghost"
							size="icon"
							{submitting}
							aria-label="Save changes"
						>
							{#snippet icon()}
								<CheckIcon
									class="stroke-success-foreground group-hover:stroke-success group-hover:scale-120 transition-all duration-200"
								/>
							{/snippet}
						</SubmitButton>

						<ErrorPopover
							errors={updateForm.fields.issues()}
							anchor={updateButton}
							title="Can't save changes"
						/>
					</form>
				</div>
			{:else}
				<div in:fade={fadeOptions} class="flex justify-end">
					<Button
						onclick={startEditing}
						class="group"
						variant="ghost"
						size="icon"
						aria-label={`Edit ${team.name}`}
					>
						<PencilIcon class="group-hover:stroke-info transition-colors duration-200" />
					</Button>
					{#snippet deleteButton()}
						<SubmitButton
							class="group"
							variant="ghost"
							size="icon"
							{submitting}
							aria-label={`Delete ${team.name}`}
							onclick={() => {
								if (confirmDelete) {
									onRequestDelete?.(team);
								}
							}}
						>
							{#snippet icon()}
								<TrashIcon class="group-hover:stroke-destructive transition-colors duration-200" />
							{/snippet}
						</SubmitButton>
					{/snippet}
					{#if confirmDelete}
						{@render deleteButton()}
					{:else}
						<form {...deleteTeam.for(team.id)}>
							<input {...deleteTeam.for(team.id).fields.id.as('hidden', team.id)} />
							{@render deleteButton()}
						</form>
					{/if}
				</div>
			{/if}
		</ExpandTransition>
	</Table.Cell>
</Table.Row>
