<script lang="ts">
	import SubmitButton from '$lib/components/SubmitButton.svelte';
	import * as Field from '$lib/components/ui/field';
	import NameSlugFields from '$lib/forms/NameSlugFields.svelte';
	import { leagueFormLabels } from '$lib/forms/labels';
	import { focusFirstError } from '$lib/forms/enhance';
	import { updateLeague } from '$lib/api/league.remote';
	import ErrorAlert from '$lib/components/ErrorAlert.svelte';
	import type { Organization } from '$lib/server/db/auth-schema';

	interface Props {
		league: Organization;
	}

	let { league }: Props = $props();
	let submitting = $state(false);

	$effect(() => {
		updateLeague.fields.set(league);
	});
</script>

<form
	{@attach focusFirstError({
		submitting,
		issues: updateLeague.fields.allIssues(),
	})}
	{...updateLeague.enhance((form) => {
		// prevents the inputs getting cleared
		// since that is default behavior
		form.submit();
	})}
>
	<Field.Set disabled={submitting}>
		<Field.Group>
			<input {...updateLeague.fields.id.as('hidden', league.id)} />
			<NameSlugFields
				labels={leagueFormLabels}
				remoteFields={{ name: updateLeague.fields.name, slug: updateLeague.fields.slug }}
				required
			/>
			<ErrorAlert errors={updateLeague.fields.issues() ?? updateLeague.fields.id.issues()} />
			<Field.Field class="mt-6 flex items-center">
				<SubmitButton {submitting} class="max-w-sm">Save Changes</SubmitButton>
			</Field.Field>
		</Field.Group>
	</Field.Set>
</form>
