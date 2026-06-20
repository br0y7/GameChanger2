<script lang="ts">
	import * as Field from '$lib/components/ui/field/index';
	import { Input } from '$lib/components/ui/input/index.js';
	import FieldErrors from './FieldErrors.svelte';
	import RefreshIcon from '@lucide/svelte/icons/refresh-cw';
	import Button from './ui/button/button.svelte';
	import { slugify } from '$lib/utils/string';

	interface Props {
		source: string;
		value: string;
		errors?: string[];
		required?: boolean;
		label?: string;
	}

	let { source, value = $bindable(), errors, required = true, label = 'Slug' }: Props = $props();
	let isCustom = $state(false);

	$effect(() => {
		if (!isCustom) {
			value = slugify(source);
		}
	});

	const reset = () => (isCustom = false);

	const oninput = () => (isCustom = true);
	const onblur = () => {
		if (!value) {
			reset();
		}
		value = slugify(value);
	};
</script>

<Field.Field>
	<Field.Label for="slug">{label}</Field.Label>
	<div class="relative">
		<Input bind:value id="slug" name="slug" {required} {onblur} {oninput} />
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

<FieldErrors {errors} />
