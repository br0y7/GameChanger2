<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Button } from './ui/button';
	import { Spinner } from './ui/spinner';
	import type { ClassValue } from 'clsx';
	import { cn } from '$lib/utils';

	let {
		children,
		submitting = false,
		class: className,
	}: {
		children?: Snippet;
		submitting?: boolean;
		class?: ClassValue;
	} = $props();
</script>

<Button type="submit" disabled={submitting} class={cn(className)}>
	{#if submitting}
		<Spinner />
	{/if}
	{#if children}
		{@render children()}
	{:else}
		Submit
	{/if}
</Button>
