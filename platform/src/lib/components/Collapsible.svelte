<script lang="ts">
	import { cn } from '$lib/utils';
	import type { ClassValue } from 'clsx';
	import type { Snippet } from 'svelte';
	import { cubicOut } from 'svelte/easing';
	import { slide, type SlideParams } from 'svelte/transition';
	import { createAccessibleTransition } from './transitions/accessibility.svelte';

	let {
		isOpen,
		children,
		class: className,
		slideOptions = { duration: 200, easing: cubicOut },
	}: {
		children: Snippet;
		class?: ClassValue;
		isOpen?: boolean;
		slideOptions?: SlideParams;
	} = $props();

	let accessibleTransition = createAccessibleTransition(slide);
</script>

{#if isOpen}
	<div class={cn(className)} transition:accessibleTransition={slideOptions}>
		{@render children()}
	</div>
{/if}
