<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Button, type ButtonProps } from './ui/button';
	import { Spinner } from './ui/spinner';

	interface Props extends ButtonProps {
		children?: Snippet;
		submitting?: boolean;
		icon?: Snippet;
		disabled?: boolean;
	}

	let {
		ref = $bindable(null),
		children,
		submitting = false,
		icon,
		disabled,
		...restProps
	}: Props = $props();
</script>

<!-- 
Spread rest props first so it won't override the specific ones for this button.
-->
<Button {...restProps} bind:ref type="submit" disabled={submitting || disabled}>
	{#if submitting}
		<Spinner />
	{:else}
		{@render icon?.()}
	{/if}
	{#if children}
		{@render children()}
	{:else if !icon}
		Submit
	{/if}
</Button>
