<script lang="ts">
	import * as Field from '$lib/components/ui/field/index';
	import Collapsible from './Collapsible.svelte';

	let { errors }: { errors?: string[] } = $props();
</script>

<Collapsible isOpen={errors && errors.length > 0}>
	{#each errors as error (error)}
		<Field.Error>{error}</Field.Error>
	{/each}
</Collapsible>
