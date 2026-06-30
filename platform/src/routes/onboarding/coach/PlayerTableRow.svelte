<script lang="ts">
	import type { Player } from '$lib/server/db/schema';
	import * as Table from '$lib/components/ui/table';
	import { fade, slide } from 'svelte/transition';
	import { createAccessibleTransition } from '$lib/accessibility.svelte';
	import SubmitButton from '$lib/components/SubmitButton.svelte';
	import { createEnhanceHandler, focusFirstError } from '$lib/forms/enhance';
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import TrashIcon from '@lucide/svelte/icons/trash-2';
	import SendIcon from '@lucide/svelte/icons/send';
	import PencilIcon from '@lucide/svelte/icons/pencil-line';
	import CloseIcon from '@lucide/svelte/icons/x';
	import CheckIcon from '@lucide/svelte/icons/check';
	import type { FormStateProp } from '$lib/forms/types';
	import type { UpdatePlayerFormSchema } from '$lib/schemas/player';
	import { Input } from '$lib/components/ui/input';
	import { tick } from 'svelte';
	import { cubicOut } from 'svelte/easing';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import * as Popover from '$lib/components/ui/popover';
	import ErrorIcon from '@lucide/svelte/icons/circle-x';

	interface Props {
		player: Player;
		submitting?: boolean;
		form?: FormStateProp<UpdatePlayerFormSchema>;
	}

	let { player, submitting = $bindable(false), form }: Props = $props();

	const accessibleSlide = createAccessibleTransition(slide);
	const fadeOptions = { duration: 200, easing: cubicOut };
	const cellSlideOptions = { duration: 200 };

	const handleDelete = createEnhanceHandler({
		onStart: () => {
			submitting = true;
		},
		onEnd: () => {
			submitting = false;
		},
	});

	let fieldRefs: Partial<Record<keyof UpdatePlayerFormSchema, HTMLInputElement | null>> = $state({
		name: null,
		jerseyNumber: null,
	});

	let isRowTarget = $derived(form?.target?.resource === 'player' && form?.target?.id === player.id);
	let updateButton: HTMLButtonElement | null = $state(null);

	const handleUpdate = createEnhanceHandler({
		onStart: () => {
			submitting = true;
		},
		onEnd: async () => {
			submitting = false;

			await tick(); // lets submitting change propagate first

			if (form?.errors && form.action === 'update' && isRowTarget) {
				focusFirstError(fieldRefs, form.errors);
			} else if (!form?.error) {
				stopEditing();
			}
		},
	});

	const updateFormId = () => `player-form-${player.id}`;
	let editing = $state(false);
	let draft: UpdatePlayerFormSchema = $state({ id: '', name: '', jerseyNumber: '' });

	async function startEditing() {
		editing = true;

		const { id, name, jerseyNumber } = player;
		draft = { id, name, jerseyNumber };

		await tick();

		fieldRefs.name?.focus();
	}

	function stopEditing() {
		editing = false;
	}
</script>

<Tooltip.Provider>
	<Table.Row>
		<Table.Cell class="font-medium">
			<div transition:accessibleSlide={cellSlideOptions}>
				{#if editing}
					{@const nameHasError = form?.errors?.name && isRowTarget && form.action === 'update'}
					<div in:fade={fadeOptions}>
						<Tooltip.Root disabled={!nameHasError} open={nameHasError}>
							<Tooltip.Trigger>
								{#snippet child({ props })}
									<Input
										{...props}
										bind:ref={fieldRefs.name}
										bind:value={draft.name}
										form={updateFormId()}
										disabled={submitting}
										name="name"
										required
										aria-invalid={nameHasError}
										type="text"
									/>
								{/snippet}
							</Tooltip.Trigger>
							<Tooltip.Content>
								{#each form?.errors?.name as error (error)}
									<span class="text-error">{error}</span>
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
					{@const jerseyHasError =
						form?.errors?.jerseyNumber && isRowTarget && form.action === 'update'}
					<div in:fade={fadeOptions}>
						<Tooltip.Root disabled={!jerseyHasError} open={jerseyHasError}>
							<Tooltip.Trigger>
								{#snippet child({ props })}
									<Input
										{...props}
										bind:ref={fieldRefs.jerseyNumber}
										bind:value={draft.jerseyNumber}
										name="jerseyNumber"
										type="text"
										aria-invalid={jerseyHasError}
										form={updateFormId()}
										placeholder={!player.jerseyNumber ? 'N/A' : null}
										inputmode="numeric"
										pattern="[0-9]+"
										title="Numbers only from 0-99"
									/>
								{/snippet}
							</Tooltip.Trigger>
							<Tooltip.Content class="bg-error-foreground text-error">
								{#each form?.errors?.jerseyNumber as error (error)}
									<span>{error}</span>
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
					{@const hasError = !!(form?.error && isRowTarget && form.action === 'update')}
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
							id={updateFormId()}
							action="?/updatePlayer"
							method="POST"
							use:enhance={handleUpdate}
						>
							<input type="hidden" name="id" value={draft.id} />
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
							<Popover.Root open={hasError}>
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
									<p class="text-error">{form?.error}</p>
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
						<form action="?/deletePlayer" method="post" use:enhance={handleDelete}>
							<input type="hidden" name="id" value={player.id} />

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
