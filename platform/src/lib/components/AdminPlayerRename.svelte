<script lang="ts">
	import { isUserAdmin } from '$lib/api/auth.remote';
	import { getFamilyPlayerHome } from '$lib/api/family.remote';
	import { getSeasonPlayers } from '$lib/api/league-manage.remote';
	import { updatePlayer } from '$lib/api/player.remote';
	import ErrorPopover from '$lib/components/ErrorPopover.svelte';
	import SubmitButton from '$lib/components/SubmitButton.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import CheckIcon from '@lucide/svelte/icons/check';
	import PencilIcon from '@lucide/svelte/icons/pencil-line';
	import CloseIcon from '@lucide/svelte/icons/x';

	let {
		playerId,
		name,
		jerseyNumber,
		seasonId = null,
	}: {
		playerId: string;
		name: string;
		jerseyNumber: string;
		seasonId?: string | null;
	} = $props();

	const isAdmin = $derived(await isUserAdmin());
	const form = $derived(updatePlayer.for(playerId));
	let editing = $state(false);
	let saveButton: HTMLButtonElement | null = $state(null);
	const submitting = $derived(!!form.pending);

	function startEditing() {
		editing = true;
		form.fields.set({
			id: playerId,
			name,
			jerseyNumber,
		});
	}

	function stopEditing() {
		editing = false;
	}
</script>

{#if isAdmin}
	<div class="mt-3">
		{#if editing}
			<form
				class="flex flex-wrap items-center gap-2"
				{...form.enhance(async ({ submit }) => {
					if (await submit()) {
						await getFamilyPlayerHome({ playerId }).refresh();
						if (seasonId) await getSeasonPlayers({ seasonId }).refresh();
						stopEditing();
					}
				})}
			>
				<input {...form.fields.id.as('hidden', playerId)} />
				<input {...form.fields.jerseyNumber.as('hidden', jerseyNumber)} />
				<Input
					{...form.fields.name.as('text')}
					required
					autocomplete="off"
					aria-label="Player name"
					class="h-9 max-w-xs border-[#2A3038] bg-[#0D1117] text-[#E6EDF3]"
				/>
				<Button
					type="button"
					variant="ghost"
					size="icon"
					class="text-[#8B949E] hover:bg-white/10 hover:text-[#E6EDF3]"
					aria-label="Cancel rename"
					disabled={submitting}
					onclick={stopEditing}
				>
					<CloseIcon class="size-4" />
				</Button>
				<SubmitButton
					bind:ref={saveButton}
					{submitting}
					variant="ghost"
					size="icon"
					class="text-[#3FB950] hover:bg-white/10"
					aria-label="Save name"
				>
					{#snippet icon()}
						<CheckIcon class="size-4" />
					{/snippet}
				</SubmitButton>
				<ErrorPopover anchor={saveButton} errors={form.fields.issues()} title="Can't save name" />
			</form>
		{:else}
			<button
				type="button"
				class="inline-flex items-center gap-1.5 text-sm font-medium text-[#58A6FF] hover:underline"
				onclick={startEditing}
			>
				<PencilIcon class="size-3.5" />
				Change name
			</button>
		{/if}
	</div>
{/if}
