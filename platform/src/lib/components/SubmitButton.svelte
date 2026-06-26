<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Button, type ButtonProps } from './ui/button';
	import { Spinner } from './ui/spinner';

	interface Props extends ButtonProps {
		children?: Snippet;
		submitting?: boolean;
		icon?: Snippet;
	}

	let { children, submitting = false, icon, ...restProps }: Props = $props();
</script>

<!-- 
Spread rest props first so it won't override the specific ones for this button.
-->
<Button {...restProps} type="submit" disabled={submitting}>
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
