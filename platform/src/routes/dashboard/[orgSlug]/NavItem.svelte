<script lang="ts">
	import type { ResolvedPathname } from '$app/types';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import type { Snippet } from 'svelte';

	interface Props {
		label: string;
		href: ResolvedPathname;
		icon: Snippet;
		reload?: boolean;
	}

	let { label, href, icon, reload = true }: Props = $props();

	const sidebar = Sidebar.useSidebar();
</script>

<Sidebar.MenuButton tooltipContent={label} onclick={() => sidebar.setOpenMobile(false)}>
	{#snippet child({ props })}
		<a {href} {...props} data-sveltekit-reload={reload ? true : undefined}>
			{@render icon()}
			<span>{label}</span>
		</a>
	{/snippet}
</Sidebar.MenuButton>
