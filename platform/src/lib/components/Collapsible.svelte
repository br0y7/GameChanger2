<script lang="ts">
	import { reducedMotion } from '$lib/accessibility.svelte';
	import { cn } from '$lib/utils';
	import type { ClassValue } from 'clsx';
	import type { Snippet } from 'svelte';
	import { cubicOut } from 'svelte/easing';
	import { slide, type SlideParams, fade } from 'svelte/transition';

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

	let accessibleTransition = (node: HTMLElement) =>
		reducedMotion.current ? fade(node, { duration: 100 }) : slide(node, slideOptions);
</script>

{#if isOpen}
	<div class={cn(className)} transition:accessibleTransition>
		{@render children()}
	</div>
{/if}
