<script lang="ts">
	import FieldErrorList from '$lib/components/FieldErrorList.svelte';
	import SlugField from '$lib/components/SlugField.svelte';
	import * as Field from '$lib/components/ui/field';
	import { Input } from '$lib/components/ui/input';
	import type { NameSlugSchema } from '$lib/schemas/common';
	import { slugify } from '$lib/utils/string';
	import type { RemoteFormField } from '@sveltejs/kit';

	interface Props {
		labels: NameSlugSchema;
		required?: boolean;
		remoteFields: {
			name: RemoteFormField<string>;
			slug: RemoteFormField<string>;
		};
		refs?: Record<keyof NameSlugSchema, HTMLInputElement | null>;
	}

	let {
		labels,
		required = false,
		remoteFields,
		refs = $bindable({ name: null, slug: null }),
	}: Props = $props();

	const ids = $derived({
		name: slugify(labels.name),
		slug: slugify(labels.slug),
	});
</script>

<Field.Field>
	<Field.Label for={ids.name}>{labels.name}</Field.Label>
	<Input id={ids.name} {...remoteFields.name.as('text')} {required} bind:ref={refs.name} />
	<FieldErrorList errors={remoteFields.name.issues()} />
</Field.Field>
<SlugField
	label={labels.slug}
	id={ids.slug}
	source={remoteFields.name.value() ?? ''}
	bind:ref={refs.slug}
	remoteField={remoteFields.slug}
	{required}
/>
