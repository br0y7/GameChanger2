<script lang="ts">
	import SubmitButton from '$lib/components/SubmitButton.svelte';
	import * as Field from '$lib/components/ui/field';
	import FieldErrorList from '$lib/components/FieldErrorList.svelte';
	import { Input } from '$lib/components/ui/input';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import { createDivision } from '$lib/api/division.remote';
	import { focusFirstError } from '$lib/forms/enhance';
	import { divisionFormLabels } from '$lib/forms/labels';
	import SlugField from '$lib/components/SlugField.svelte';
	import * as Select from '$lib/components/ui/select';
	import { divisionTypes } from '$lib/schemas/division';
	import SelectField from '$lib/components/SelectField.svelte';

	interface Props {
		seasonId: string;
	}

	let { seasonId }: Props = $props();

	const submitting = $derived(!!createDivision.pending);

	createDivision.fields.type.set('community');
</script>

<form
	{@attach focusFirstError({ submitting, issues: createDivision.fields.allIssues() })}
	{...createDivision}
>
	<input {...createDivision.fields.seasonId.as('hidden', seasonId)} />
	<Field.Set disabled={submitting} class="flex flex-col gap-4">
		<Field.Group class="grid sm:grid-cols-3 gap-1 gap-y-4">
			<Field.Field class="sm:col-span-2 w-full px-0.5">
				<Field.Label for="division-name">{divisionFormLabels.name}</Field.Label>
				<Input id="division-name" {...createDivision.fields.name.as('text')} required autofocus />
			</Field.Field>
			<Field.Field class="w-full px-1">
				<SelectField
					label="Type"
					placeholder="Select a type"
					field={createDivision.fields.type}
					required
				>
					{#snippet trigger({ content, isPlaceholder })}
						<span class={{ capitalize: !isPlaceholder }}>{content}</span>
					{/snippet}
					{#each divisionTypes as type (type)}
						<Select.Item value={type} class="capitalize">{type}</Select.Item>
					{/each}
				</SelectField>
			</Field.Field>
			<Field.Field class="sm:col-span-2 w-full px-0.5">
				<SlugField
					id="division-slug"
					source={createDivision.fields.name.value() ?? ''}
					remoteField={createDivision.fields.slug}
					label={divisionFormLabels.slug}
				/>
			</Field.Field>
			<Field.Field class="flex items-center w-full mt-4 sm:mt-auto px-2">
				<SubmitButton {submitting} aria-label="Add Division">
					{#snippet icon()}
						<PlusIcon />
					{/snippet}
					Add Division
				</SubmitButton>
			</Field.Field>
		</Field.Group>
		<Field.Group>
			<FieldErrorList errors={createDivision.fields.allIssues()} />
		</Field.Group>
	</Field.Set>
</form>
