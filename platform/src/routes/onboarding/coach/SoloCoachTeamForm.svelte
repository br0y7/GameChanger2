<script lang="ts">
	import SubmitButton from '$lib/components/SubmitButton.svelte';
	import * as Field from '$lib/components/ui/field';
	import NameSlugFields from '$lib/forms/NameSlugFields.svelte';
	import { teamFormLabels } from '$lib/forms/labels';
	import { focusFirstError } from '$lib/forms/enhance';
	import { createTeam } from '$lib/api/team.remote';
	import ErrorAlert from '$lib/components/ErrorAlert.svelte';

	let submitting = $derived(!!createTeam.pending);
</script>

<h1 class="text-2xl font-bold text-center">Create your Team</h1>
<form
	{@attach focusFirstError({
		submitting,
		issues: createTeam.fields.allIssues(),
	})}
	{...createTeam}
>
	<Field.Set disabled={submitting}>
		<Field.Group class="px-1">
			<input {...createTeam.fields.flow.as('hidden', 'solo-coach')} />
			<NameSlugFields
				labels={teamFormLabels}
				remoteFields={{
					name: createTeam.fields.name,
					slug: createTeam.fields.slug,
				}}
				required
			/>
			<ErrorAlert errors={createTeam.fields.issues()} />
			<Field.Field class="mt-6">
				<SubmitButton {submitting}>Create Team</SubmitButton>
			</Field.Field>
		</Field.Group>
	</Field.Set>
</form>
