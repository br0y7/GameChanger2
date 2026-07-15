<script lang="ts">
	import { IsReducedMotion } from '$lib/hooks/is-reduced-motion.svelte';
	import { cn } from '$lib/utils';
	import type { ClassValue } from 'clsx';
	import type { Snippet } from 'svelte';
	import { fade, fly } from 'svelte/transition';

	interface Props {
		children?: Snippet;
		duration?: number;
		distance?: string | number;
		direction?: 'left' | 'right' | 'up' | 'down';
		class?: ClassValue;
	}

	let {
		children,
		duration = 200,
		distance = 8,
		direction = 'left',
		class: className,
	}: Props = $props();

	const invert = (value: number | string) => {
		if (typeof value === 'number') return -value;
		return value.startsWith('-') ? value.slice(1) : `-${value}`;
	};

	let fadeOptions = { duration: 100 };
	let isReducedMotion = new IsReducedMotion();

	let enter = (node: HTMLElement) => {
		if (isReducedMotion.current) {
			return fade(node, { ...fadeOptions, delay: fadeOptions.duration });
		}

		const directionMap = {
			left: { x: distance, y: 0 },
			right: { x: invert(distance), y: 0 },
			up: { x: 0, y: distance },
			down: { x: 0, y: invert(distance) },
		};

		return fly(node, {
			...directionMap[direction],
			duration,
			delay: duration,
		});
	};

	let exit = (node: HTMLElement) => {
		if (isReducedMotion.current) {
			return fade(node, fadeOptions);
		}

		const directionMap = {
			left: { x: invert(distance), y: 0 },
			right: { x: distance, y: 0 },
			up: { x: 0, y: invert(distance) },
			down: { x: 0, y: distance },
		};

		return fly(node, {
			...directionMap[direction],
			duration,
		});
	};
</script>

<div in:enter out:exit class={cn(className)}>{@render children?.()}</div>
