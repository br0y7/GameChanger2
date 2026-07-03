<script lang="ts">
	import SubmitButton from '$lib/components/SubmitButton.svelte';
	import * as Field from '$lib/components/ui/field';
	import FieldErrorList from '$lib/components/FieldErrorList.svelte';
	import { Input } from '$lib/components/ui/input';
	import PlusIcon from '@lucide/svelte/icons/user-plus';
	import { addPlayer, type CreatePlayerInput } from '$lib/api/player.remote';
	import { focusFirstError } from '$lib/forms/enhance';
	import ErrorAlert from '$lib/components/ErrorAlert.svelte';

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
		submitting = !!addPlayer.pending;
	});
</script>

<form
	{@attach focusFirstError({ submitting, issues: addPlayer.fields.allIssues() })}
	{...addPlayer}
>
	<input {...addPlayer.fields.teamId.as('hidden', player.teamId)} />
	<Field.Set disabled={submitting} class="flex flex-col gap-4">
		<Field.Group class="grid grid-cols-5 gap-1">
			<Field.Field class="col-span-3 w-full px-1">
				<Field.Label for="player-name">Player Name</Field.Label>
				<Input id="player-name" {...addPlayer.fields.name.as('text')} required autofocus />
			</Field.Field>
			<Field.Field class="w-full">
				<Field.Label for="player-jersey-number">Jersey #</Field.Label>
				<Input
					id="player-jersey-number"
					{...addPlayer.fields.jerseyNumber.as('text')}
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
			<FieldErrorList errors={addPlayer.fields.name.issues()} />
			<FieldErrorList errors={addPlayer.fields.jerseyNumber.issues()} />
		</Field.Group>
		<ErrorAlert errors={addPlayer.fields.issues()} />
	</Field.Set>
</form>
