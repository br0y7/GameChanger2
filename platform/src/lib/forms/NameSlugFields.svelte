<script lang="ts">
	import FieldErrorList from '$lib/components/FieldErrorList.svelte';
	import SlugField from '$lib/components/SlugField.svelte';
	import * as Field from '$lib/components/ui/field';
	import { Input } from '$lib/components/ui/input';
	import type { NameSlugSchema } from '$lib/schemas/common';
	import { cn } from '$lib/utils';
	import { slugify } from '$lib/utils/string';
	import type { RemoteFormField } from '@sveltejs/kit';
	import type { ClassValue } from 'clsx';
	import FieldErrorTooltip from '$lib/components/FieldErrorTooltip.svelte';

	interface Props {
		labels: NameSlugSchema;
		required?: boolean;
		remoteFields: {
			name: RemoteFormField<string>;
			slug: RemoteFormField<string>;
		};
		refs?: Record<keyof NameSlugSchema, HTMLInputElement | null>;
		fieldClasses?: {
			name: ClassValue;
			slug: ClassValue;
		};
		errorDisplayType?: 'none' | 'list-per-field' | 'tooltip';
	}

	let {
		labels,
		required = false,
		remoteFields,
		refs = $bindable({ name: null, slug: null }),
		fieldClasses,
		errorDisplayType = 'list-per-field',
	}: Props = $props();

	const ids = $derived({
		name: slugify(labels.name),
		slug: slugify(labels.slug),
	});
</script>

{#snippet nameField()}
	<Input
		id={ids.name}
		{...remoteFields.name.as('text')}
		{required}
		bind:ref={refs.name}
		autocomplete="off"
	/>
{/snippet}

{#snippet slugField()}
	<SlugField
		label={labels.slug}
		id={ids.slug}
		source={remoteFields.name.value() ?? ''}
		bind:ref={refs.slug}
		remoteField={remoteFields.slug}
		errors={errorDisplayType === 'list-per-field' ? remoteFields.slug.issues() : []}
		class={fieldClasses?.slug}
		{required}
	/>
{/snippet}

<Field.Field class={cn(fieldClasses?.name)}>
	<Field.Label for={ids.name}>{labels.name}</Field.Label>
	{#if errorDisplayType === 'tooltip'}
		<FieldErrorTooltip remoteField={remoteFields.name} anchor={refs.name}>
			{@render nameField()}
		</FieldErrorTooltip>
	{:else}
		{@render nameField()}
		{#if errorDisplayType === 'list-per-field'}
			<FieldErrorList errors={remoteFields.name.issues()} />
		{/if}
	{/if}
</Field.Field>
{#if errorDisplayType === 'tooltip'}
	<div class={cn(fieldClasses?.slug)}>
		<FieldErrorTooltip remoteField={remoteFields.slug} anchor={refs.slug}>
			{@render slugField()}
		</FieldErrorTooltip>
	</div>
{:else}
	{@render slugField()}
{/if}
