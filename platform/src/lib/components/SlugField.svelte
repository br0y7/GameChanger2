<script lang="ts">
	import * as Field from '$lib/components/ui/field/index';
	import { Input } from '$lib/components/ui/input/index.js';
	import FieldErrorList from './FieldErrorList.svelte';
	import RefreshIcon from '@lucide/svelte/icons/refresh-cw';
	import Button from './ui/button/button.svelte';
	import { slugify } from '$lib/utils/string';
	import type { RemoteFormField, RemoteFormIssue } from '@sveltejs/kit';

	interface Props {
		source: string;
		required?: boolean;
		id?: string;
		label?: string;
		ref?: HTMLInputElement | null;
		remoteField: RemoteFormField<string>;
		errors?: RemoteFormIssue[];
	}

	let {
		source,
		required = false,
		id = 'slug',
		label = 'Slug',
		ref = $bindable(null),
		remoteField,
		errors,
	}: Props = $props();
	let isCustom = $state(false);

	let value = $derived(remoteField.value() ?? '');

	$effect(() => {
		if (!isCustom) {
			remoteField.set(slugify(source));
		}
	});

	const reset = () => (isCustom = false);

	const oninput = () => (isCustom = true);
	const onblur = () => {
		if (!value) {
			reset();
		}
		remoteField.set(slugify(value));
	};
</script>

<Field.Field>
	<Field.Label for={id}>{label}</Field.Label>
	<div class="relative">
		<Input {...remoteField.as('text')} {id} name="slug" {required} {onblur} {oninput} bind:ref />
		{#if isCustom}
			<Button
				class="absolute right-0 text-muted-foreground hover:text-foreground transition-colors "
				variant="ghost"
				size="icon"
				onclick={reset}
			>
				<RefreshIcon />
			</Button>
		{/if}
	</div>
</Field.Field>

<FieldErrorList {errors} />
