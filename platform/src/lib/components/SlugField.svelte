<script lang="ts">
	import * as Field from '$lib/components/ui/field/index';
	import { Input } from '$lib/components/ui/input/index.js';
	import FieldErrorList from './FieldErrorList.svelte';
	import RefreshIcon from '@lucide/svelte/icons/refresh-cw';
	import Button from './ui/button/button.svelte';
	import { slugify } from '$lib/utils/string';
	import type { RemoteFormField, RemoteFormIssue } from '@sveltejs/kit';
	import type { ClassValue } from 'clsx';
	import { cn } from '$lib/utils';
	import { onMount } from 'svelte';

	interface Props {
		source: string;
		required?: boolean;
		id?: string;
		label?: string;
		ref?: HTMLElement | null;
		remoteField: RemoteFormField<string>;
		errors?: RemoteFormIssue[];
		class?: ClassValue;
		form?: string;
	}

	let {
		source,
		required = false,
		id,
		label,
		ref = $bindable(null),
		remoteField,
		form,
		errors,
		class: className,
	}: Props = $props();
	let isCustom = $state(false);

	let value = $state('');

	onMount(() => {
		value = remoteField.value() ?? '';
		if (slugify(source) !== value) {
			isCustom = true;
		}
	});

	$effect(() => {
		if (!isCustom) {
			value = slugify(source);
		}
	});

	$effect(() => {
		if (label && !id) {
			id = slugify(label);
		}
	});

	const reset = () => {
		isCustom = false;
	};

	const oninput = () => (isCustom = true);
	const onblur = () => {
		if (!value) {
			reset();
		}

		value = slugify(value);
	};
</script>

<Field.Field class={cn(className)}>
	{#if label}
		<Field.Label for={id}>{label}</Field.Label>
	{/if}
	<div class="relative">
		<Input
			{...{ ...remoteField.as('text'), value: undefined }}
			{id}
			{required}
			{onblur}
			{oninput}
			{form}
			autocomplete="off"
			bind:ref
			bind:value
		/>
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
