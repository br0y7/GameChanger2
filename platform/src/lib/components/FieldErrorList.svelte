<script lang="ts">
	import * as Field from '$lib/components/ui/field/index';
	import type { RemoteFormIssue } from '@sveltejs/kit';
	import Collapsible from './Collapsible.svelte';

	let { errors }: { errors?: RemoteFormIssue[] } = $props();
</script>

<Collapsible isOpen={(errors ?? []).length > 0}>
	{#each errors as error (error.message)}
		<Field.Error>{error.message}</Field.Error>
	{/each}
</Collapsible>
