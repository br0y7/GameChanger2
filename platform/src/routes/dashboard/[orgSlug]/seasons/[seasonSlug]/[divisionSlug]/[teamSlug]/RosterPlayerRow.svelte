<script lang="ts">
	import type { Player } from '$lib/server/db/schema';
	import * as Table from '$lib/components/ui/table';
	import { fade } from 'svelte/transition';
	import SubmitButton from '$lib/components/SubmitButton.svelte';
	import { focusFirstError } from '$lib/forms/enhance';
	import { Button } from '$lib/components/ui/button';
	import PencilIcon from '@lucide/svelte/icons/pencil-line';
	import CloseIcon from '@lucide/svelte/icons/x';
	import CheckIcon from '@lucide/svelte/icons/check';
	import { Input } from '$lib/components/ui/input';
	import { tick } from 'svelte';
	import { cubicOut } from 'svelte/easing';
	import { updatePlayer } from '$lib/api/player.remote';
	import { getTeam } from '$lib/api/team.remote';
	import { getPlayerGameCount } from '$lib/api/player-game-stat.remote';
	import type { UpdatePlayerInput } from '$lib/schemas/player';
	import FieldErrorTooltip from '$lib/components/FieldErrorTooltip.svelte';
	import ErrorPopover from '$lib/components/ErrorPopover.svelte';
	import ExpandTransition from '$lib/components/transitions/ExpandTransition.svelte';

	interface Props {
		player: Player;
		playerHref: string;
		teamSlug: string;
		divisionId: string;
	}

	let { player, playerHref, teamSlug, divisionId }: Props = $props();

	const fadeOptions = { duration: 200, easing: cubicOut };

	let updateForm = $derived(updatePlayer.for(player.id));
	const updateFormId = () => `roster-player-form-${player.id}`;
	let updateButton: HTMLButtonElement | null = $state(null);
	let editing = $state(false);
	let submitting = $derived(!!updateForm.pending);

	let inputs: Record<keyof Omit<UpdatePlayerInput, 'id'>, HTMLInputElement | null> = $state({
		name: null,
		jerseyNumber: null,
	});

	async function startEditing() {
		editing = true;
		updateForm.fields.set({
			id: player.id,
			name: player.name,
			jerseyNumber: player.jerseyNumber ?? '',
		});
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
				await getTeam({
					slug: teamSlug,
					divisionId,
					include: { players: true },
				}).refresh();
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
		<ExpandTransition>
			{#if editing}
				<div in:fade={fadeOptions}>
					<FieldErrorTooltip remoteField={updateForm.fields.name} anchor={inputs.name}>
						<Input
							{...updateForm.fields.name.as('text')}
							required
							form={updateFormId()}
							bind:ref={inputs.name}
							autocomplete="off"
							oninput={(e) => updateForm.fields.name.set(e.currentTarget.value)}
						/>
					</FieldErrorTooltip>
				</div>
			{:else}
				<div in:fade={fadeOptions} class="truncate">
					<a href={playerHref} class="underline">{player.name}</a>
				</div>
			{/if}
		</ExpandTransition>
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
							inputmode="numeric"
							form={updateFormId()}
							bind:ref={inputs.jerseyNumber}
							autocomplete="off"
							class="text-center"
							oninput={(e) => {
								const digits = e.currentTarget.value.replace(/\D/g, '').slice(0, 2);
								e.currentTarget.value = digits;
								updateForm.fields.jerseyNumber.set(digits);
							}}
						/>
					</FieldErrorTooltip>
				</div>
			{:else}
				<div in:fade={fadeOptions}>{player.jerseyNumber}</div>
			{/if}
		</ExpandTransition>
	</Table.Cell>
	<Table.Cell class="hidden text-center sm:table-cell">
		{#await getPlayerGameCount({ playerId: player.id }) then count}
			{count}
		{/await}
	</Table.Cell>
	<Table.Cell>
		<ExpandTransition>
			{#if editing}
				<div in:fade={fadeOptions} class="flex justify-end gap-1">
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
					<form {...enhancedUpdateForm} id={updateFormId()} bind:this={updateFormElement}>
						<input {...updateForm.fields.id.as('hidden', player.id)} />
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
						<ErrorPopover
							anchor={updateButton}
							errors={updateForm.fields.issues()}
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
						aria-label={`Edit ${player.name}`}
					>
						<PencilIcon class="transition-colors duration-200 group-hover:stroke-info" />
					</Button>
				</div>
			{/if}
		</ExpandTransition>
	</Table.Cell>
</Table.Row>
