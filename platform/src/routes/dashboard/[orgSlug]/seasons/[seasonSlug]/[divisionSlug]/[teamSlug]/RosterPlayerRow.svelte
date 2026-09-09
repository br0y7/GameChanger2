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
	import MoreHorizontalIcon from '@lucide/svelte/icons/ellipsis';
	import { Input } from '$lib/components/ui/input';
	import { tick } from 'svelte';
	import { cubicOut } from 'svelte/easing';
	import { updatePlayer } from '$lib/api/player.remote';
	import { getTeam } from '$lib/api/team.remote';
	import { getTeamOverview } from '$lib/api/team-overview.remote';
	import type { UpdatePlayerInput } from '$lib/schemas/player';
	import FieldErrorTooltip from '$lib/components/FieldErrorTooltip.svelte';
	import ErrorPopover from '$lib/components/ErrorPopover.svelte';
	import ExpandTransition from '$lib/components/transitions/ExpandTransition.svelte';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';

	interface RosterAverages {
		gamesPlayed: number;
		points: number;
		rebounds: number;
		assists: number;
	}

	interface Props {
		player: Player;
		playerHref: string;
		teamSlug: string;
		divisionId: string;
		seasonId: string;
		averages?: RosterAverages | null;
	}

	let { player, playerHref, teamSlug, divisionId, seasonId, averages = null }: Props = $props();

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
				await Promise.all([
					getTeam({
						slug: teamSlug,
						divisionId,
						include: { players: true },
					}).refresh(),
					getTeamOverview({
						teamId: player.teamId,
						divisionId,
						seasonId,
					}).refresh(),
				]);
				stopEditing();
			}
		})
	);

	const formatAvg = (value: number | undefined) =>
		(value ?? 0).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
</script>

<Table.Row
	class="border-[#2A3038] hover:bg-white/5"
	{@attach focusFirstError({
		submitting,
		issues: updateForm.fields.allIssues(),
	})}
>
	<Table.Cell class="w-14 text-center tabular-nums text-[#8B949E]">
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
							class="h-8 border-[#2A3038] bg-[#0D1117] text-center text-foreground"
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
							class="h-8 border-[#2A3038] bg-[#0D1117] text-foreground"
							oninput={(e) => updateForm.fields.name.set(e.currentTarget.value)}
						/>
					</FieldErrorTooltip>
				</div>
			{:else}
				<div in:fade={fadeOptions} class="truncate">
					<a href={playerHref} class="text-[#E6EDF3] hover:text-[#58A6FF] hover:underline">
						{player.name}
					</a>
				</div>
			{/if}
		</ExpandTransition>
	</Table.Cell>

	<Table.Cell class="text-center tabular-nums text-[#E6EDF3]">
		{averages?.gamesPlayed ?? 0}
	</Table.Cell>
	<Table.Cell class="text-center tabular-nums text-[#E6EDF3]">{formatAvg(averages?.points)}</Table.Cell>
	<Table.Cell class="text-center tabular-nums text-[#E6EDF3]">{formatAvg(averages?.rebounds)}</Table.Cell>
	<Table.Cell class="text-center tabular-nums text-[#E6EDF3]">{formatAvg(averages?.assists)}</Table.Cell>

	<Table.Cell class="w-12 text-end">
		<ExpandTransition>
			{#if editing}
				<div in:fade={fadeOptions} class="flex justify-end gap-1">
					<Button
						disabled={submitting}
						onclick={stopEditing}
						class="group text-[#8B949E] hover:bg-white/10 hover:text-[#E6EDF3]"
						variant="ghost"
						size="icon"
						aria-label="Cancel edit"
					>
						<CloseIcon class="size-4" />
					</Button>
					<form {...enhancedUpdateForm} id={updateFormId()} bind:this={updateFormElement}>
						<input {...updateForm.fields.id.as('hidden', player.id)} />
						<SubmitButton
							bind:ref={updateButton}
							class="group text-[#3FB950] hover:bg-white/10"
							variant="ghost"
							size="icon"
							{submitting}
							aria-label="Save changes"
						>
							{#snippet icon()}
								<CheckIcon class="size-4" />
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
					<DropdownMenu.Root>
						<DropdownMenu.Trigger>
							{#snippet child({ props })}
								<Button
									{...props}
									variant="ghost"
									size="icon"
									class="text-[#8B949E] hover:bg-white/10 hover:text-[#E6EDF3]"
									aria-label={`Actions for ${player.name}`}
								>
									<MoreHorizontalIcon class="size-4" />
								</Button>
							{/snippet}
						</DropdownMenu.Trigger>
						<DropdownMenu.Content align="end" class="border-[#2A3038] bg-[#161B22] text-[#E6EDF3]">
							<DropdownMenu.Item
								class="cursor-pointer focus:bg-white/10"
								onclick={startEditing}
							>
								<PencilIcon class="size-4" />
								Edit player
							</DropdownMenu.Item>
						</DropdownMenu.Content>
					</DropdownMenu.Root>
				</div>
			{/if}
		</ExpandTransition>
	</Table.Cell>
</Table.Row>
