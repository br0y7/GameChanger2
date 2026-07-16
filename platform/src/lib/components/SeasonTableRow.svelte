<script lang="ts">
	import * as Table from '$lib/components/ui/table/index.js';
	import type { Season } from '$lib/server/db/schema';
	import { fade } from 'svelte/transition';
	import ExpandTransition from './transitions/ExpandTransition.svelte';
	import { Badge } from './ui/badge';
	import { cubicOut } from 'svelte/easing';
	import FieldErrorTooltip from './FieldErrorTooltip.svelte';
	import { updateSeason } from '$lib/api/season.remote';
	import { seasonStatuses, type UpdateSeasonInput } from '$lib/schemas/season';
	import { tick } from 'svelte';
	import { Input } from './ui/input';
	import SlugField from './SlugField.svelte';
	import SelectField from './SelectField.svelte';
	import * as Select from '$lib/components/ui/select/index.js';
	import { Button } from './ui/button';
	import PencilIcon from '@lucide/svelte/icons/pencil-line';
	import CloseIcon from '@lucide/svelte/icons/x';
	import CheckIcon from '@lucide/svelte/icons/check';
	import SubmitButton from './SubmitButton.svelte';
	import { focusFirstError } from '$lib/forms/enhance';
	import ErrorPopover from './ErrorPopover.svelte';
	import { resolve } from '$app/paths';
	import TrashIcon from '@lucide/svelte/icons/trash-2';

	interface Props {
		season: Season;
		onDelete: (season: Season) => void;
	}

	let { season, onDelete }: Props = $props();

	const badgeVariant = $derived(season.status === 'active' ? 'info' : 'success');
	const fadeOptions = { duration: 200, easing: cubicOut };

	let updateForm = $derived(updateSeason.for(season.id));
	const updateFormId = () => `season-form-${season.id}`;
	let updateButton: HTMLButtonElement | null = $state(null);

	let submitting = $derived(!!updateForm.pending);
	let editing = $state(false);

	let fieldRefs: Record<keyof Omit<UpdateSeasonInput, 'id'>, HTMLElement | null> = $state({
		name: null,
		slug: null,
		status: null,
	});

	$effect(() => {
		submitting = !!updateForm.pending;
	});

	async function startEditing() {
		editing = true;

		updateForm.fields.set(season);

		await tick();

		fieldRefs.name?.focus();
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
</script>

<Table.Row
	{@attach focusFirstError({
		submitting,
		issues: updateForm.fields.allIssues(),
	})}
>
	<Table.Cell>
		<ExpandTransition>
			{#if editing}
				<div in:fade={fadeOptions}>
					<FieldErrorTooltip remoteField={updateForm.fields.name} anchor={fieldRefs.name}>
						<Input
							{...updateForm.fields.name.as('text')}
							required
							form={updateFormId()}
							bind:ref={fieldRefs.name}
							oninput={(e) => {
								// remove this if the 'value' reactivity actually works in the future
								updateForm.fields.name.set(e.currentTarget.value);
							}}
							autocomplete="off"
						/>
					</FieldErrorTooltip>
				</div>
			{:else}
				<div in:fade={fadeOptions} class="truncate">
					<a
						href={resolve('/dashboard/seasons/[slug].svelte', { slug: season.slug })}
						class="underline"
					>
						{season.name}
					</a>
				</div>
			{/if}
		</ExpandTransition>
	</Table.Cell>
	<Table.Cell>
		<ExpandTransition>
			{#if editing}
				<div in:fade={fadeOptions}>
					<FieldErrorTooltip remoteField={updateForm.fields.slug} anchor={fieldRefs.slug}>
						<SlugField
							source={updateForm.fields.name.value() ?? ''}
							remoteField={updateForm.fields.slug}
							form={updateFormId()}
							bind:ref={fieldRefs.slug}
						/>
					</FieldErrorTooltip>
				</div>
			{:else}
				<div in:fade={fadeOptions} class="truncate">
					{season.slug}
				</div>
			{/if}
		</ExpandTransition>
	</Table.Cell>
	<Table.Cell>
		<ExpandTransition>
			{#if editing}
				<div in:fade={fadeOptions}>
					<FieldErrorTooltip remoteField={updateForm.fields.status} anchor={fieldRefs.status}>
						<SelectField field={updateForm.fields.status} form={updateFormId()}>
							{#each seasonStatuses as status (status)}
								<Select.Item value={status}>{status}</Select.Item>
							{/each}
						</SelectField>
					</FieldErrorTooltip>
				</div>
			{:else}
				<div in:fade={fadeOptions}>
					<Badge variant={badgeVariant}>
						{season.status}
					</Badge>
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
						<input {...updateForm.fields.id.as('hidden', season.id)} />
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
						<ErrorPopover anchor={updateButton} errors={updateForm.fields.issues()} />
					</form>
				</div>
			{:else}
				<div in:fade={fadeOptions} class="flex justify-end">
					<Button onclick={startEditing} class="group" variant="ghost" size="icon">
						<PencilIcon class="group-hover:stroke-info transition-colors duration-200" />
					</Button>
					<Button onclick={() => onDelete(season)} class="group" variant="ghost" size="icon">
						<TrashIcon class="group-hover:stroke-error transition-colors duration-200" />
					</Button>
				</div>
			{/if}
		</ExpandTransition>
	</Table.Cell>
</Table.Row>
