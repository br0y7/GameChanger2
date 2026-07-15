<script lang="ts">
	import * as Field from '$lib/components/ui/field/index';
	import type { RemoteFormIssue } from '@sveltejs/kit';
	import type { ClassValue } from 'clsx';
	import ExpandTransition from './transitions/ExpandTransition.svelte';

	let { errors, class: className }: { errors?: RemoteFormIssue[]; class?: ClassValue } = $props();
</script>

{#if (errors ?? []).length > 0}
	<ExpandTransition class={className}>
		{#each errors as error (error.message)}
			<Field.Error>{error.message}</Field.Error>
		{/each}
	</ExpandTransition>
{/if}
