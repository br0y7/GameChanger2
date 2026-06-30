<script lang="ts">
	import FieldErrorList from '$lib/components/FieldErrorList.svelte';
	import SlugField from '$lib/components/SlugField.svelte';
	import * as Field from '$lib/components/ui/field';
	import { Input } from '$lib/components/ui/input';
	import { slugify } from '$lib/utils/string';
	import { type FieldErrorsState } from './types';

	interface NameSlugFieldValues {
		name: string;
		slug: string;
	}

	interface Props {
		nameLabel: string;
		slugLabel: string;
		values?: NameSlugFieldValues;
		errors?: FieldErrorsState<NameSlugFieldValues>['errors'];
		required?: boolean;
		refs?: Partial<Record<keyof NameSlugFieldValues, HTMLInputElement | null>>;
	}

	let {
		nameLabel,
		slugLabel,
		required = true,
		values = $bindable({ name: '', slug: '' }),
		errors,
		refs = $bindable({ name: null, slug: null }),
	}: Props = $props();

	const nameId = $derived(slugify(nameLabel));
	const slugId = $derived(slugify(slugLabel));
</script>

<Field.Field>
	<Field.Label for={nameId}>{nameLabel}</Field.Label>
	<Input
		id={slugId}
		name="name"
		type="text"
		bind:value={values.name}
		{required}
		bind:ref={refs.name}
	/>
	<FieldErrorList errors={errors?.name} />
</Field.Field>
<SlugField
	label={slugLabel}
	id={slugId}
	source={values.name}
	bind:value={values.slug}
	errors={errors?.slug}
	bind:ref={refs.slug}
	{required}
/>
