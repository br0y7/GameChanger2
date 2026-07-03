<script lang="ts">
	import FieldErrorList from '$lib/components/FieldErrorList.svelte';
	import SlugField from '$lib/components/SlugField.svelte';
	import * as Field from '$lib/components/ui/field';
	import { Input } from '$lib/components/ui/input';
	import { slugify } from '$lib/utils/string';
	import type { RemoteFormField } from '@sveltejs/kit';

	interface NameSlugFieldValues {
		name: string;
		slug: string;
	}

	interface Props {
		nameLabel: string;
		slugLabel: string;
		required?: boolean;
		remoteFields: {
			name: RemoteFormField<string>;
			slug: RemoteFormField<string>;
		};
		refs?: Partial<Record<keyof NameSlugFieldValues, HTMLInputElement | null>>;
	}

	let {
		nameLabel,
		slugLabel,
		required = false,
		remoteFields,
		refs = $bindable({ name: null, slug: null }),
	}: Props = $props();

	const nameId = $derived(slugify(nameLabel));
	const slugId = $derived(slugify(slugLabel));
</script>

<Field.Field>
	<Field.Label for={nameId}>{nameLabel}</Field.Label>
	<Input id={slugId} {...remoteFields.name.as('text')} {required} bind:ref={refs.name} />
	<FieldErrorList errors={remoteFields.name.issues()} />
</Field.Field>
<SlugField
	label={slugLabel}
	id={slugId}
	source={remoteFields.name.value() ?? ''}
	bind:ref={refs.slug}
	remoteField={remoteFields.slug}
	{required}
/>
