<script lang="ts">
	import * as Field from '$lib/components/ui/field/index';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Checkbox } from '$lib/components/ui/checkbox/index';
	import { Label } from '$lib/components/ui/label/index.js';
	import FieldErrors from './FieldErrors.svelte';

	let showPassword = $state(false);

	interface Props {
		value?: string;
		errors?: string[];
	}

	let { value = $bindable(), errors }: Props = $props();
</script>

<Field.Group class="pb-2">
	<Field.Field>
		<Field.Label for="password">Password</Field.Label>
		<Input
			bind:value
			id="password"
			name="password"
			type={showPassword ? 'text' : 'password'}
			required
		/>
	</Field.Field>

	<Field.Field orientation="horizontal">
		<Checkbox id="show-pass" bind:checked={showPassword} />
		<Label for="show-pass" class="text-muted-foreground">Show password</Label>
	</Field.Field>

	<FieldErrors {errors} />
</Field.Group>
