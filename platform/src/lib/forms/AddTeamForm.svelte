<script lang="ts">
	import SubmitButton from '$lib/components/SubmitButton.svelte';
	import * as Field from '$lib/components/ui/field';
	import NameSlugFields from '$lib/forms/NameSlugFields.svelte';
	import { teamFormLabels } from '$lib/forms/labels';
	import { focusFirstError } from '$lib/forms/enhance';
	import { createTeam } from '$lib/api/team.remote';
	import ErrorAlert from '$lib/components/ErrorAlert.svelte';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import ErrorPopover from '$lib/components/ErrorPopover.svelte';

	let submitting = $derived(!!createTeam.pending);

	let { divisionId }: { divisionId: string } = $props();

	let createTeamForm = $derived(createTeam.for(divisionId));
	let submitButton: HTMLButtonElement | null = $state(null);
</script>

<form
	{@attach focusFirstError({
		submitting,
		issues: createTeamForm.fields.allIssues(),
	})}
	{...createTeamForm}
>
	<Field.Set disabled={submitting}>
		<Field.Group class="grid grid-cols-5 gap-2 px-0.5">
			<input {...createTeamForm.fields.flow.as('hidden', 'standard')} />
			<input {...createTeamForm.fields.divisionId.as('hidden', divisionId)} />
			<NameSlugFields
				labels={teamFormLabels}
				remoteFields={{
					name: createTeamForm.fields.name,
					slug: createTeamForm.fields.slug,
				}}
				fieldClasses={{
					name: 'col-span-2 w-full',
					slug: 'col-span-2 w-full',
				}}
				errorDisplayType="tooltip"
				required
			/>
			<ErrorAlert errors={createTeamForm.fields.issues()} />
			<Field.Field class="mt-auto">
				<SubmitButton {submitting} bind:ref={submitButton} aria-label="Add Team">
					<PlusIcon />
					Add
				</SubmitButton>
				<ErrorPopover
					errors={createTeamForm.fields.issues() ?? createTeamForm.fields.divisionId.issues()}
					anchor={submitButton}
				/>
			</Field.Field>
		</Field.Group>
	</Field.Set>
</form>
