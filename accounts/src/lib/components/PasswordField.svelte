<script lang="ts">
	import * as Field from '$lib/components/ui/field/index';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Checkbox } from '$lib/components/ui/checkbox/index';
	import { Label } from '$lib/components/ui/label/index.js';

	let showPassword = $state(false);

	let { value = $bindable() } = $props();
</script>

<div class="flex flex-col gap-4 pb-2">
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

	<div class="flex gap-2">
		<Checkbox id="show-pass" bind:checked={showPassword} />
		<Label for="show-pass" class="text-muted-foreground">Show password</Label>
	</div>
</div>
