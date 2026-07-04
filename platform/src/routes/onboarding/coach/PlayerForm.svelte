<script lang="ts">
	import SubmitButton from '$lib/components/SubmitButton.svelte';
	import * as Field from '$lib/components/ui/field';
	import FieldErrorList from '$lib/components/FieldErrorList.svelte';
	import { Input } from '$lib/components/ui/input';
	import PlusIcon from '@lucide/svelte/icons/user-plus';
	import { createPlayer } from '$lib/api/player.remote';
	import { focusFirstError } from '$lib/forms/enhance';
	import ErrorAlert from '$lib/components/ErrorAlert.svelte';
	import type { CreatePlayerInput } from '$lib/schemas/player';

	interface Props {
		player: CreatePlayerInput;
		submitting?: boolean;
	}

	let {
		player = $bindable({
			name: '',
			teamId: '',
		}),
		submitting = $bindable(false),
	}: Props = $props();

	$effect(() => {
		submitting = !!createPlayer.pending;
	});
</script>

<form
	{@attach focusFirstError({ submitting, issues: createPlayer.fields.allIssues() })}
	{...createPlayer}
>
	<input {...createPlayer.fields.teamId.as('hidden', player.teamId)} />
	<Field.Set disabled={submitting} class="flex flex-col gap-4">
		<Field.Group class="grid grid-cols-5 gap-1">
			<Field.Field class="col-span-3 w-full px-1">
				<Field.Label for="player-name">Player Name</Field.Label>
				<Input id="player-name" {...createPlayer.fields.name.as('text')} required autofocus />
			</Field.Field>
			<Field.Field class="w-full">
				<Field.Label for="player-jersey-number">Jersey #</Field.Label>
				<Input
					id="player-jersey-number"
					{...createPlayer.fields.jerseyNumber.as('text')}
					inputmode="numeric"
					pattern="[0-9]+"
					title="Numbers only from 0-99"
				/>
			</Field.Field>
			<Field.Field class="w-full mt-auto">
				<SubmitButton {submitting}>
					{#snippet icon()}
						<PlusIcon />
					{/snippet}
					Add
				</SubmitButton>
			</Field.Field>
		</Field.Group>
		<Field.Group class="gap-0.5">
			<FieldErrorList errors={createPlayer.fields.name.issues()} />
			<FieldErrorList errors={createPlayer.fields.jerseyNumber.issues()} />
		</Field.Group>
		<ErrorAlert errors={createPlayer.fields.issues()} />
	</Field.Set>
</form>
