<script lang="ts">
	import SubmitButton from '$lib/components/SubmitButton.svelte';
	import * as Field from '$lib/components/ui/field';
	import NameSlugFields from '$lib/forms/NameSlugFields.svelte';
	import { seasonFormLabels } from '$lib/forms/labels';
	import { createSeason } from '$lib/api/season.remote';
	import ErrorAlert from '$lib/components/ErrorAlert.svelte';
	import SelectField from '$lib/components/SelectField.svelte';
	import { seasonStatuses } from '$lib/schemas/season';
	import * as Select from '$lib/components/ui/select/index.js';
	import FieldErrorList from '$lib/components/FieldErrorList.svelte';
	import type { Snippet } from 'svelte';

	interface Props {
		hideStatus?: boolean;
		submitButton?: Snippet<[{ submitting: boolean }]>;
	}
	let { hideStatus, submitButton }: Props = $props();
	let submitting = $derived(!!createSeason.pending);

	createSeason.fields.status.set('active');
</script>

<form {...createSeason}>
	<Field.Set disabled={submitting}>
		<Field.Group>
			<NameSlugFields
				labels={seasonFormLabels}
				remoteFields={{
					name: createSeason.fields.name,
					slug: createSeason.fields.slug,
				}}
				required
			/>
			{#if hideStatus}
				<input {...createSeason.fields.status.as('hidden', 'active')} />
			{:else}
				<Field.Field orientation="horizontal">
					<SelectField
						label={seasonFormLabels.status}
						field={createSeason.fields.status}
						placeholder="Select status"
						required
					>
						{#snippet trigger({ content, isPlaceholder })}
							<span class={{ capitalize: !isPlaceholder }}>{content}</span>
						{/snippet}
						{#each seasonStatuses as status (status)}
							<Select.Item value={status} class="capitalize">{status}</Select.Item>
						{/each}
					</SelectField>
				</Field.Field>
				<FieldErrorList errors={createSeason.fields.status.issues()} />
			{/if}
			<ErrorAlert errors={createSeason.fields.issues()} />
			<Field.Field class="mt-6">
				{#if submitButton}
					{@render submitButton({ submitting })}
				{:else}
					<SubmitButton {submitting}>Create Season</SubmitButton>
				{/if}
			</Field.Field>
		</Field.Group>
	</Field.Set>
</form>
