<script lang="ts">
	import type { ResolvedPathname } from '$app/types';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import type { Snippet } from 'svelte';

	interface Props {
		label: string;
		href: ResolvedPathname;
		icon: Snippet;
	}

	let { label, href, icon }: Props = $props();
</script>

<Sidebar.MenuButton tooltipContent={label}>
	{#snippet child({ props })}
		<a {href} {...props}>
			{@render icon()}
			<span>{label}</span>
		</a>
	{/snippet}
</Sidebar.MenuButton>
