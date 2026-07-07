<script lang="ts">
	import * as Select from '$lib/components/ui/select/index.js';
	import * as Field from '$lib/components/ui/field/index.js';
	import type { RemoteFormField, RemoteFormIssue } from '@sveltejs/kit';
	import type { Snippet } from 'svelte';
	import { slugify } from '$lib/utils/string';
	import FieldErrorList from './FieldErrorList.svelte';

	interface Props {
		field: RemoteFormField<string>;
		children: Snippet;
		placeholder?: string;
		trigger?: Snippet<
			[
				{
					content: string;
					isPlaceholder: boolean;
				},
			]
		>;
		required?: boolean;
		clearOptionLabel?: string;
		label?: string;
		id?: string;
		errors?: RemoteFormIssue[];
	}

	let {
		label,
		field,
		errors,
		trigger,
		children,
		required,
		clearOptionLabel = 'None',
		placeholder = 'Select an option',
		id = label ? slugify(label) : undefined,
	}: Props = $props();

	let value = $state('');
	let triggerContent = $derived(value || placeholder);
	let isPlaceholder = $derived(triggerContent === placeholder);
</script>

{#if label}
	<Field.Label for={id}>{label}</Field.Label>
{/if}

<Select.Root type="single" bind:value>
	<Select.Trigger {id} aria-invalid={field.as('hidden', value)['aria-invalid']}>
		{#if trigger}
			{@render trigger({ content: triggerContent, isPlaceholder })}
		{:else}
			{triggerContent}
		{/if}
	</Select.Trigger>
	<Select.Content>
		{#if !required}
			<Select.Item value="" class="text-muted-foreground">{clearOptionLabel}</Select.Item>
		{/if}
		{@render children?.()}
	</Select.Content>
	<input {...field.as('hidden', value)} bind:value />
</Select.Root>

<FieldErrorList {errors} />
