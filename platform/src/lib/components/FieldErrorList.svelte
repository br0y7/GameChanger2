<script lang="ts">
	import * as Field from '$lib/components/ui/field/index';
	import type { RemoteFormIssue } from '@sveltejs/kit';
	import Collapsible from './Collapsible.svelte';
	import type { ClassValue } from 'clsx';

	let { errors, class: className }: { errors?: RemoteFormIssue[]; class?: ClassValue } = $props();
</script>

<Collapsible isOpen={(errors ?? []).length > 0} class={className}>
	{#each errors as error (error.message)}
		<Field.Error>{error.message}</Field.Error>
	{/each}
</Collapsible>
