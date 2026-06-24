<script lang="ts">
	import { enhance } from '$app/forms';
	import SubmitButton from '$lib/components/SubmitButton.svelte';
	import * as Field from '$lib/components/ui/field';
	import Collapsible from '$lib/components/Collapsible.svelte';
	import * as Alert from '$lib/components/ui/alert';
	import ErrorIcon from '@lucide/svelte/icons/circle-x';
	import type { SubmitFunction } from '@sveltejs/kit';
	import type { FormStateProp } from '$lib/forms/types';
	import type { LeagueFormSchema } from '$lib/schemas/league';
	import { createEnhanceHandler } from '$lib/forms/enhance';
	import NameSlugFields from '$lib/forms/NameSlugFields.svelte';
	import { leagueFormLabels } from '$lib/forms/labels';

	type SuccessResult = { id: string };
	interface Props {
		form?: FormStateProp<LeagueFormSchema, SuccessResult>;
		league?: LeagueFormSchema;
	}

	let {
		league = $bindable({
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

<h1 class="text-2xl font-bold text-center">Create your League</h1>
<form action="?/createLeague" method="POST" use:enhance={handleSubmission}>
	<Field.Set disabled={submitting}>
		<Field.Group>
			<NameSlugFields {...leagueFormLabels} values={league} errors={form?.errors} />
			<Collapsible isOpen={!!form?.error}>
				<Alert.Root variant="destructive">
					<ErrorIcon />
					<Alert.Title>Error</Alert.Title>
					<Alert.Description>{form?.error}</Alert.Description>
				</Alert.Root>
			</Collapsible>
			<Field.Field class="mt-6">
				<SubmitButton {submitting}>Create League</SubmitButton>
			</Field.Field>
		</Field.Group>
	</Field.Set>
</form>
