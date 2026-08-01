<script lang="ts">
	import SubmitButton from '$lib/components/SubmitButton.svelte';
	import * as Field from '$lib/components/ui/field';
	import NameSlugFields from '$lib/forms/NameSlugFields.svelte';
	import { leagueFormLabels } from '$lib/forms/labels';
	import { focusFirstError } from '$lib/forms/enhance';
	import { createLeague } from '$lib/api/league.remote';
	import ErrorAlert from '$lib/components/ErrorAlert.svelte';

	let submitting = $state(false);
</script>

<h1 class="text-2xl font-bold text-center">Create your League</h1>
<form
	{@attach focusFirstError({
		submitting,
		issues: createLeague.fields.allIssues(),
	})}
	{...createLeague}
>
	<Field.Set disabled={submitting}>
		<Field.Group>
			<NameSlugFields
				labels={leagueFormLabels}
				remoteFields={{ name: createLeague.fields.name, slug: createLeague.fields.slug }}
				required
			/>
			<ErrorAlert errors={createLeague.fields.issues()} />
			<Field.Field class="mt-6">
				<SubmitButton {submitting}>Create League</SubmitButton>
			</Field.Field>
		</Field.Group>
	</Field.Set>
</form>
