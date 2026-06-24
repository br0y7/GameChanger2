<script lang="ts">
	import { enhance } from '$app/forms';
	import FieldErrorList from '$lib/components/FieldErrorList.svelte';
	import SlugField from '$lib/components/SlugField.svelte';
	import SubmitButton from '$lib/components/SubmitButton.svelte';
	import * as Field from '$lib/components/ui/field';
	import { Input } from '$lib/components/ui/input';
	import type { SubmitFunction } from '@sveltejs/kit';
	import Collapsible from '$lib/components/Collapsible.svelte';
	import * as Alert from '$lib/components/ui/alert';
	import ErrorIcon from '@lucide/svelte/icons/circle-x';
	import type { FormState } from '$lib/forms/types';
	import type { SeasonFormSchema } from '$lib/schemas/season';

	type SuccessResult = { id: string };
	interface Props {
		form?: Partial<FormState<SeasonFormSchema, SuccessResult>> | null;
		season?: SeasonFormSchema;
		onSuccess?: (result: SuccessResult) => void;
	}

	let {
		season = $bindable({
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

<form action="?/createSeason" method="POST" use:enhance={handleSubmission}>
	<Field.Set disabled={submitting}>
		<Field.Group>
			<div class="flex flex-col gap-1">
				<h1 class="text-2xl font-bold text-center">Create your first Season</h1>
				<p class="text-center text-muted-foreground">
					Track teams, schedule games, and log results for your new season.
				</p>
			</div>
			<Field.Field>
				<Field.Label for="season-name">Season Name</Field.Label>
				<Input id="season-name" name="name" type="text" bind:value={season.name} />
				<FieldErrorList errors={errors?.name} />
			</Field.Field>
			<SlugField
				label="Season Slug"
				id="season-slug"
				source={season.name}
				bind:value={season.slug}
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
				<SubmitButton {submitting}>Create Season</SubmitButton>
			</Field.Field>
		</Field.Group>
	</Field.Set>
</form>
