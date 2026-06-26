<script lang="ts">
	import { enhance } from '$app/forms';
	import SubmitButton from '$lib/components/SubmitButton.svelte';
	import * as Field from '$lib/components/ui/field';
	import Collapsible from '$lib/components/Collapsible.svelte';
	import * as Alert from '$lib/components/ui/alert';
	import ErrorIcon from '@lucide/svelte/icons/circle-x';
	import type { SubmitFunction } from '@sveltejs/kit';
	import type { FormStateProp } from '$lib/forms/types';
	import { createEnhanceHandler, focusFirstError } from '$lib/forms/enhance';
	import type { PlayerFormSchema } from '$lib/schemas/player';
	import FieldErrorList from '$lib/components/FieldErrorList.svelte';
	import { Input } from '$lib/components/ui/input';
	import PlusIcon from '@lucide/svelte/icons/user-plus';
	import { tick } from 'svelte';

	interface Props {
		form?: FormStateProp<PlayerFormSchema>;
		player: PlayerFormSchema;
		submitting?: boolean;
	}

	let {
		player = $bindable({
			name: '',
			teamId: '',
		}),
		form,
		submitting = $bindable(false),
	}: Props = $props();

	let fieldRefs: Partial<Record<keyof PlayerFormSchema, HTMLInputElement | null>> = $state({
		name: null,
		jerseyNumber: null,
	});

	const handleSubmission: SubmitFunction = createEnhanceHandler({
		onStart: () => {
			submitting = true;
		},
		onEnd: async () => {
			submitting = false;

			await tick(); // lets submitting change propagate first

			if (form?.errors) {
				focusFirstError(fieldRefs, form.errors);
			} else {
				fieldRefs.name?.focus();
			}
		},
	});
</script>

<form action="?/addPlayer" method="POST" use:enhance={handleSubmission}>
	<input type="hidden" name="teamId" value={player.teamId} />
	<Field.Set disabled={submitting} class="flex flex-col gap-4">
		<Field.Group class="grid grid-cols-5 gap-1">
			<Field.Field class="col-span-3 w-full px-1">
				<Field.Label for="player-name">Player Name</Field.Label>
				<Input
					bind:ref={fieldRefs.name}
					id="player-name"
					name="name"
					type="text"
					bind:value={player.name}
					required
					autofocus
					aria-invalid={!!form?.errors?.name}
				/>
			</Field.Field>
			<Field.Field class="w-full">
				<Field.Label for="player-jersey-number">Jersey #</Field.Label>
				<Input
					bind:ref={fieldRefs.jerseyNumber}
					id="player-jersey-number"
					name="jerseyNumber"
					bind:value={player.jerseyNumber}
					type="text"
					inputmode="numeric"
					pattern="[0-9]+"
					title="Numbers only from 0-99"
					aria-invalid={!!form?.errors?.jerseyNumber}
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
			<FieldErrorList errors={form?.errors?.name} />
			<FieldErrorList errors={form?.errors?.jerseyNumber} />
		</Field.Group>
		<Collapsible isOpen={!!form?.error}>
			<Alert.Root variant="destructive">
				<ErrorIcon />
				<Alert.Title>Error</Alert.Title>
				<Alert.Description>{form?.error}</Alert.Description>
			</Alert.Root>
		</Collapsible>
	</Field.Set>
</form>
