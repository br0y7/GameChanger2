<script lang="ts">
	import { enhance } from '$app/forms';
	import SubmitButton from '$lib/components/SubmitButton.svelte';
	import * as Field from '$lib/components/ui/field';
	import Collapsible from '$lib/components/Collapsible.svelte';
	import * as Alert from '$lib/components/ui/alert';
	import ErrorIcon from '@lucide/svelte/icons/circle-x';
	import { type TeamOrgFormSchema } from '$lib/schemas/team';
	import { createEnhanceHandler } from '$lib/forms/enhance';
	import NameSlugFields from '$lib/forms/NameSlugFields.svelte';
	import { teamFormLabels } from '$lib/forms/labels';
	import type { FormStateProp } from '$lib/forms/types';

	interface Props {
		form?: FormStateProp<TeamOrgFormSchema>;
		team?: TeamOrgFormSchema;
		submitting?: boolean;
	}

	let {
		team = $bindable({
			name: '',
			slug: '',
		}),
		form,
		submitting = $bindable(false),
	}: Props = $props();

	const handleSubmission = createEnhanceHandler({
		onStart: () => {
			submitting = true;
		},
		onEnd: () => {
			submitting = false;
		},
	});
</script>

<h1 class="text-2xl font-bold text-center">Create your Team</h1>
<form action="?/createTeam" method="POST" use:enhance={handleSubmission}>
	<Field.Set disabled={submitting}>
		<Field.Group>
			<NameSlugFields {...teamFormLabels} errors={form?.errors} values={team} />
			<Collapsible isOpen={!!form?.error}>
				<Alert.Root variant="destructive">
					<ErrorIcon />
					<Alert.Title>Error</Alert.Title>
					<Alert.Description>{form?.error}</Alert.Description>
				</Alert.Root>
			</Collapsible>
			<Field.Field class="mt-6">
				<SubmitButton {submitting}>Create Team</SubmitButton>
			</Field.Field>
		</Field.Group>
	</Field.Set>
</form>
