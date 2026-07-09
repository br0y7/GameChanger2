<script lang="ts">
	import { inView } from '$lib/attachments/in-view';
	import { cn } from '$lib/utils';
	import type { ClassValue } from 'clsx';
	import { expoOut } from 'svelte/easing';
	import { Tween } from 'svelte/motion';
	import type { TweenOptions } from 'svelte/motion';

	interface Props {
		start?: number;
		end: number;
		options?: TweenOptions<number> & {};
		format?: (v: number) => string | number;
		class?: ClassValue;
	}

	let {
		start = 0,
		end,
		options = { easing: expoOut, duration: 3000 },
		format = (v) => v,
		class: className,
	}: Props = $props();
	let visible = $state(false);

	let value = Tween.of(() => start);
</script>

<span
	{@attach inView({
		once: false,
		onEnter() {
			value.set(end, options);
			visible = true;
		},
		onExit() {
			value.target = start;
			visible = false;
		},
	})}
	style:opacity={visible ? 1 : 0}
	style:transition="opacity 300ms ease-out"
	class={cn(className)}
>
	{format(value.current)}
</span>
