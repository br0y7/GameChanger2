<script lang="ts">
	import * as Field from '$lib/components/ui/field/index';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Checkbox } from '$lib/components/ui/checkbox/index';
	import { Label } from '$lib/components/ui/label/index.js';
	import FieldErrorList from './FieldErrorList.svelte';
	import type { HTMLInputAttributes } from 'svelte/elements';
	import type { WithElementRef } from '$lib/utils';
	import type { RemoteFormIssue } from '@sveltejs/kit';

	let showPassword = $state(false);

	interface Props extends Omit<
		WithElementRef<HTMLInputAttributes, HTMLInputElement>,
		'type' | 'files'
	> {
		errors?: RemoteFormIssue[];
	}

	let { ref = $bindable(null), errors, ...restProps }: Props = $props();
</script>

<Field.Group class="pb-2">
	<Field.Field>
		<Field.Label for="password">Password</Field.Label>
		<Input {...restProps} id="password" bind:ref type={showPassword ? 'text' : 'password'} />
	</Field.Field>

	<Field.Field orientation="horizontal">
		<Checkbox id="show-pass" bind:checked={showPassword} />
		<Label for="show-pass" class="text-muted-foreground">Show password</Label>
	</Field.Field>

	<FieldErrorList {errors} />
</Field.Group>
