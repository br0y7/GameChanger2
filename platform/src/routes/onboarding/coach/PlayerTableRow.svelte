<script lang="ts">
	import type { Player } from '$lib/server/db/schema';
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
	import { deletePlayer, updatePlayer } from '$lib/api/player.remote';
	import FieldErrorTooltip from '$lib/components/FieldErrorTooltip.svelte';
	import ErrorPopover from '$lib/components/ErrorPopover.svelte';
	import ExpandTransition from '$lib/components/transitions/ExpandTransition.svelte';

	interface Props {
		player: Player;
		submitting?: boolean;
	}

	let { player, submitting = $bindable(false) }: Props = $props();

	const fadeOptions = { duration: 200, easing: cubicOut };

	let updateForm = $derived(updatePlayer.for(player.id));
	const updateFormId = () => `player-form-${player.id}`;
	let updateButton: HTMLButtonElement | null = $state(null);

	let editing = $state(false);

	let inputs: { jerseyNumber: HTMLInputElement | null } = $state({ jerseyNumber: null });

	$effect(() => {
		submitting = !!updateForm.pending;
	});

	async function startEditing() {
		editing = true;

		const { name, jerseyNumber } = player;
		updateForm.fields.set({ id: player.id, name, jerseyNumber: jerseyNumber ?? '' });

		await tick();

		inputs.jerseyNumber?.focus();
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
	<Table.Cell class="font-medium">
		<!-- Names are admin-only to change; remove and re-add the player to fix a typo. -->
		<div>{player.name}</div>
	</Table.Cell>
	<Table.Cell class="text-center">
		<ExpandTransition>
			{#if editing}
				<div in:fade={fadeOptions}>
					<FieldErrorTooltip
						remoteField={updateForm.fields.jerseyNumber}
						anchor={inputs.jerseyNumber}
					>
						<Input
							{...updateForm.fields.jerseyNumber.as('text')}
							placeholder={!player.jerseyNumber ? 'N/A' : null}
							inputmode="numeric"
							pattern="[0-9]+"
							title="Numbers only from 0-99"
							form={updateFormId()}
							bind:ref={inputs.jerseyNumber}
							autocomplete="off"
						/>
					</FieldErrorTooltip>
				</div>
			{:else}
				{#if player.jerseyNumber}
					{player.jerseyNumber}
				{:else}
					<span class="text-muted-foreground"> N/A </span>
				{/if}
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
							class="stroke-muted-foreground transition-colors duration-200 group-hover:stroke-foreground"
						/>
					</Button>
					<form
						{@attach focusFirstError({
							submitting,
							issues: updateForm.fields.allIssues(),
						})}
						{...enhancedUpdateForm}
						id={updateFormId()}
						bind:this={updateFormElement}
					>
						<input {...updateForm.fields.id.as('hidden', player.id)} />
						<input {...updateForm.fields.name.as('hidden', player.name)} />
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
									class="stroke-success-foreground transition-all duration-200 group-hover:scale-120 group-hover:stroke-success"
								/>
							{/snippet}
						</SubmitButton>
						<ErrorPopover anchor={updateButton} errors={updateForm.fields.issues()} />
					</form>
				</div>
			{:else}
				<div in:fade={fadeOptions} class="flex justify-end">
					<Button onclick={startEditing} class="group" variant="ghost" size="icon">
						<PencilIcon class="transition-colors duration-200 group-hover:stroke-info" />
					</Button>
					<form {...deletePlayer.for(player.id)}>
						<input {...deletePlayer.for(player.id).fields.id.as('hidden', player.id)} />

						<SubmitButton
							class="group"
							variant="ghost"
							size="icon"
							{submitting}
							aria-label="Delete a player"
						>
							{#snippet icon()}
								<TrashIcon class="transition-colors duration-200 group-hover:stroke-destructive" />
							{/snippet}
						</SubmitButton>
					</form>
				</div>
			{/if}
		</ExpandTransition>
	</Table.Cell>
</Table.Row>
