<script lang="ts">
	import { cn } from '$lib/utils';
	import type { ClassValue } from 'clsx';
	import type { Snippet } from 'svelte';
	import { cubicOut } from 'svelte/easing';
	import { slide, type SlideParams } from 'svelte/transition';
	import { createAccessibleTransition } from './accessibility.svelte';

	let {
		children,
		class: className,
		options = { duration: 200, easing: cubicOut },
	}: {
		children: Snippet;
		class?: ClassValue;
		options?: SlideParams;
	} = $props();

	let accessibleTransition = createAccessibleTransition(slide);
</script>

<div class={cn(className)} transition:accessibleTransition={options}>
	{@render children()}
</div>
