<script lang="ts">
	import { enhance } from '$app/forms';
	import FieldErrorList from '$lib/components/FieldErrorList.svelte';
	import SlugField from '$lib/components/SlugField.svelte';
	import SubmitButton from '$lib/components/SubmitButton.svelte';
	import * as Field from '$lib/components/ui/field';
	import { Input } from '$lib/components/ui/input';
	import Collapsible from '$lib/components/Collapsible.svelte';
	import * as Alert from '$lib/components/ui/alert';
	import ErrorIcon from '@lucide/svelte/icons/circle-x';
	import type { SubmitFunction } from '@sveltejs/kit';
	import type { FormState } from '$lib/forms/types';
	import type { LeagueFormSchema } from '$lib/schemas/league';

	type SuccessResult = { id: string };
	interface Props {
		form?: Partial<FormState<LeagueFormSchema, SuccessResult>> | null;
		league?: LeagueFormSchema;
		onSuccess?: (result: SuccessResult) => void;
	}

	let {
		league = $bindable({
			name: '',
			slug: '',
		}),
		form,
		onSuccess,
	}: Props = $props();
	let submitting = $state(false);

	let errors = $derived(form && 'errors' in form ? form.errors : undefined);
	let errorMessage = $derived(form && 'error' in form ? form.error?.message : undefined);

	const handleSubmission: SubmitFunction = () => {
		submitting = true;

		return async ({ update, result }) => {
			try {
				await update();

				if (result.type === 'success') {
					onSuccess?.(result.data as SuccessResult);
				}
			} finally {
				submitting = false;
			}
		};
	};
</script>

<h1 class="text-2xl font-bold text-center">Create your League</h1>
<form action="?/createLeague" method="POST" use:enhance={handleSubmission}>
	<Field.Set disabled={submitting}>
		<Field.Group>
			<Field.Field>
				<Field.Label for="league-name">League Name</Field.Label>
				<Input id="league-name" name="name" type="text" bind:value={league.name} />
				<FieldErrorList errors={errors?.name} />
			</Field.Field>
			<SlugField
				label="League Slug"
				id="league-slug"
				source={league.name}
				bind:value={league.slug}
				errors={errors?.slug}
			/>
			<Collapsible isOpen={!!errorMessage}>
				<Alert.Root variant="destructive">
					<ErrorIcon />
					<Alert.Title>Error</Alert.Title>
					<Alert.Description>{errorMessage}</Alert.Description>
				</Alert.Root>
			</Collapsible>
			<Field.Field class="mt-6">
				<SubmitButton {submitting}>Create League</SubmitButton>
			</Field.Field>
		</Field.Group>
	</Field.Set>
</form>
