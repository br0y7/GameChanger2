<script lang="ts">
	import { enhance } from '$app/forms';
	import SubmitButton from '$lib/components/SubmitButton.svelte';
	import * as Field from '$lib/components/ui/field';
	import type { SubmitFunction } from '@sveltejs/kit';
	import Collapsible from '$lib/components/Collapsible.svelte';
	import * as Alert from '$lib/components/ui/alert';
	import ErrorIcon from '@lucide/svelte/icons/circle-x';
	import type { FormStateProp } from '$lib/forms/types';
	import type { SeasonFormSchema } from '$lib/schemas/season';
	import { createEnhanceHandler } from '$lib/forms/enhance';
	import NameSlugFields from '$lib/forms/NameSlugFields.svelte';
	import { seasonFormLabels } from '$lib/forms/labels';

	type SuccessResult = { id: string };
	interface Props {
		form?: FormStateProp<SeasonFormSchema, SuccessResult>;
		season?: SeasonFormSchema;
	}

	let {
		season = $bindable({
			name: '',
			slug: '',
		}),
		form,
	}: Props = $props();

	let submitting = $state(false);

	const handleSubmission: SubmitFunction = createEnhanceHandler<SuccessResult>({
		onStart: () => (submitting = true),
		onEnd: () => (submitting = false),
	});
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
			<NameSlugFields {...seasonFormLabels} values={season} errors={form?.errors} />
			<Collapsible isOpen={!!form?.error}>
				<Alert.Root variant="destructive">
					<ErrorIcon />
					<Alert.Title>Error</Alert.Title>
					<Alert.Description>{form?.error}</Alert.Description>
				</Alert.Root>
			</Collapsible>
			<Field.Field class="mt-6">
				<SubmitButton {submitting}>Create Season</SubmitButton>
			</Field.Field>
		</Field.Group>
	</Field.Set>
</form>
