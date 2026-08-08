<script lang="ts">
	import SubmitButton from '$lib/components/SubmitButton.svelte';
	import * as Field from '$lib/components/ui/field';
	import NameSlugFields from '$lib/forms/NameSlugFields.svelte';
	import { leagueFormLabels } from '$lib/forms/labels';
	import { focusFirstError } from '$lib/forms/enhance';
	import { updateLeague } from '$lib/api/league.remote';
	import ErrorAlert from '$lib/components/ErrorAlert.svelte';
	import type { Organization } from '$lib/server/db/auth-schema';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

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
	{...updateLeague.enhance(async (form) => {
		// prevents the inputs getting cleared
		// since that is default behavior
		if ((await form.submit()) && form.result && form.result.slug != page.params.orgSlug) {
			goto(resolve('/dashboard/[orgSlug]/settings', { orgSlug: form.result.slug }));
		}
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
