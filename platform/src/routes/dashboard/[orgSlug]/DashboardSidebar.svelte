<script lang="ts">
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import type { ComponentProps } from 'svelte';
	import NavUser from './NavUser.svelte';
	import NavMain from './NavMain.svelte';
	import NavModeToggle from './NavModeToggle.svelte';
	import NavHeader from './NavHeader.svelte';
	import NavItem from './NavItem.svelte';
	import { resolve } from '$app/paths';
	import HouseIcon from '@lucide/svelte/icons/house';

	interface Props extends ComponentProps<typeof Sidebar.Root> {
		orgSlug: string;
	}
	let { ref = $bindable(null), collapsible = 'icon', orgSlug, ...restProps }: Props = $props();
</script>

<Sidebar.Root bind:ref {collapsible} {...restProps}>
	<Sidebar.Header>
		<NavHeader {orgSlug} />
	</Sidebar.Header>
	<Sidebar.Content>
		<NavMain {orgSlug} />
	</Sidebar.Content>
	<Sidebar.Footer>
		<Sidebar.Menu>
			<NavItem label="Home" href={resolve('/')}>
				{#snippet icon()}
					<HouseIcon />
				{/snippet}
			</NavItem>
		</Sidebar.Menu>
		<NavModeToggle />
		<NavUser />
	</Sidebar.Footer>
	<Sidebar.Rail />
</Sidebar.Root>
