<script lang="ts">
	import SubmitButton from '$lib/components/SubmitButton.svelte';
	import * as Field from '$lib/components/ui/field';
	import NameSlugFields from '$lib/forms/NameSlugFields.svelte';
	import { seasonFormLabels } from '$lib/forms/labels';
	import { createSeason } from '$lib/api/season.remote';
	import ErrorAlert from '$lib/components/ErrorAlert.svelte';

	let submitting = $derived(!!createSeason.pending);
</script>

<form {...createSeason}>
	<Field.Set disabled={submitting}>
		<Field.Group>
			<div class="flex flex-col gap-1">
				<h1 class="text-2xl font-bold text-center">Create your first Season</h1>
				<p class="text-center text-muted-foreground">
					Track teams, schedule games, and log results for your new season.
				</p>
			</div>
			<NameSlugFields
				labels={seasonFormLabels}
				remoteFields={{
					name: createSeason.fields.name,
					slug: createSeason.fields.slug,
				}}
			/>
			<ErrorAlert errors={createSeason.fields.issues()} />
			<Field.Field class="mt-6">
				<SubmitButton {submitting}>Create Season</SubmitButton>
			</Field.Field>
		</Field.Group>
	</Field.Set>
</form>
