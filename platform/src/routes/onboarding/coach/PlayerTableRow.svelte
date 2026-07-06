<script lang="ts">
	import type { Player } from '$lib/server/db/schema';
	import * as Table from '$lib/components/ui/table';
	import { fade, slide } from 'svelte/transition';
	import { createAccessibleTransition } from '$lib/accessibility.svelte';
	import SubmitButton from '$lib/components/SubmitButton.svelte';
	import { focusFirstError } from '$lib/forms/enhance';
	import { Button } from '$lib/components/ui/button';
	import TrashIcon from '@lucide/svelte/icons/trash-2';
	import SendIcon from '@lucide/svelte/icons/send';
	import PencilIcon from '@lucide/svelte/icons/pencil-line';
	import CloseIcon from '@lucide/svelte/icons/x';
	import CheckIcon from '@lucide/svelte/icons/check';
	import { Input } from '$lib/components/ui/input';
	import { tick } from 'svelte';
	import { cubicOut } from 'svelte/easing';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import * as Popover from '$lib/components/ui/popover';
	import ErrorIcon from '@lucide/svelte/icons/circle-x';
	import { deletePlayer, updatePlayer } from '$lib/api/player.remote';
	import type { UpdatePlayerInput } from '$lib/schemas/player';

	interface Props {
		player: Player;
		submitting?: boolean;
	}

	let { player, submitting = $bindable(false) }: Props = $props();

	const accessibleSlide = createAccessibleTransition(slide);
	const fadeOptions = { duration: 200, easing: cubicOut };
	const cellSlideOptions = { duration: 200 };

	let updateButton: HTMLButtonElement | null = $state(null);

	const updateFormId = () => `player-form-${player.id}`;
	let editing = $state(false);

	let inputs: Partial<Record<keyof UpdatePlayerInput, HTMLInputElement | null>> = $state({
		name: null,
		jerseyNumber: null,
	});

	let updateForm = $derived(updatePlayer.for(player.id));

	$effect(() => {
		submitting = !!updateForm.pending;
	});

	async function startEditing() {
		editing = true;

		const { name, jerseyNumber } = player;
		updateForm.fields.set({ id: player.id, name, jerseyNumber: jerseyNumber ?? '' });

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
</script>

<Tooltip.Provider>
	<Table.Row
		{@attach focusFirstError({
			submitting,
			issues: updateForm.fields.allIssues(),
		})}
	>
		<Table.Cell class="font-medium">
			<div transition:accessibleSlide={cellSlideOptions}>
				{#if editing}
					{@const nameHasError = (updateForm.fields.name.issues() ?? []).length > 0}
					<div in:fade={fadeOptions}>
						<Tooltip.Root open={nameHasError} disabled={!nameHasError}>
							<Tooltip.Trigger>
								<Input
									{...updateForm.fields.name.as('text')}
									required
									form={updateFormId()}
									bind:ref={inputs.name}
								/>
							</Tooltip.Trigger>
							<Tooltip.Content customAnchor={inputs.name} class="bg-error-foreground text-error">
								{#each updateForm.fields.name.issues() as error (error.message)}
									<span class="text-error">{error.message}</span>
								{/each}
							</Tooltip.Content>
						</Tooltip.Root>
					</div>
				{:else}
					<div in:fade={fadeOptions}>
						{player.name}
					</div>
				{/if}
			</div>
		</Table.Cell>
		<Table.Cell class="text-center">
			<div transition:accessibleSlide={cellSlideOptions}>
				{#if editing}
					{@const jerseyHasError = (updateForm.fields.jerseyNumber.issues() ?? []).length > 0}
					<div in:fade={fadeOptions}>
						<Tooltip.Root open={jerseyHasError} disabled={!jerseyHasError}>
							<Tooltip.Trigger>
								<Input
									{...updateForm.fields.jerseyNumber.as('text')}
									placeholder={!player.jerseyNumber ? 'N/A' : null}
									inputmode="numeric"
									pattern="[0-9]+"
									title="Numbers only from 0-99"
									form={updateFormId()}
									bind:ref={inputs.jerseyNumber}
								/>
							</Tooltip.Trigger>
							<Tooltip.Content
								customAnchor={inputs.jerseyNumber}
								class="bg-error-foreground text-error"
							>
								{#each updateForm.fields.jerseyNumber.issues() as error (error.message)}
									<span>{error.message}</span>
								{/each}
							</Tooltip.Content>
						</Tooltip.Root>
					</div>
				{:else}
					{#if player.jerseyNumber}
						{player.jerseyNumber}
					{:else}
						<span class="text-muted-foreground"> N/A </span>
					{/if}
				{/if}
			</div>
		</Table.Cell>
		<Table.Cell>
			<div transition:accessibleSlide={cellSlideOptions}>
				{#if editing}
					<div in:fade={fadeOptions} class="w-24 flex justify-end">
						<Button
							disabled={submitting}
							onclick={stopEditing}
							class="group"
							variant="ghost"
							size="icon"
						>
							<CloseIcon
								class="stroke-muted-foreground group-hover:stroke-foreground transition-colors duration-200"
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
							<SubmitButton
								bind:ref={updateButton}
								class="group"
								variant="ghost"
								size="icon"
								{submitting}
								aria-label="Save player changes"
							>
								{#snippet icon()}
									<CheckIcon
										class="stroke-success-foreground group-hover:stroke-success group-hover:scale-120 transition-all duration-200"
									/>
								{/snippet}
							</SubmitButton>
							<Popover.Root open={(updateForm.fields.issues() ?? []).length > 0}>
								<Popover.Content
									customAnchor={updateButton}
									class="bg-error-foreground flex flex-col gap-0.5"
									role="alert"
									aria-live="assertive"
								>
									<div class="flex gap-1">
										<ErrorIcon class="stroke-error" aria-hidden="true" />
										<h4 class="font-bold text-error">Can't save changes</h4>
									</div>
									{#each updateForm.fields.issues() as error (error.message)}
										<p class="text-error">{error.message}</p>
									{/each}
								</Popover.Content>
							</Popover.Root>
						</form>
					</div>
				{:else}
					<div in:fade={fadeOptions} class="w-24 flex justify-end">
						<Button class="group" variant="ghost">
							<SendIcon class="group-hover:stroke-info transition-colors duration-200" />
						</Button>
						<Button onclick={startEditing} class="group" variant="ghost" size="icon">
							<PencilIcon class="group-hover:stroke-info transition-colors duration-200" />
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
									<TrashIcon
										class="group-hover:stroke-destructive transition-colors duration-200"
									/>
								{/snippet}
							</SubmitButton>
						</form>
					</div>
				{/if}
			</div>
		</Table.Cell>
	</Table.Row>
</Tooltip.Provider>
