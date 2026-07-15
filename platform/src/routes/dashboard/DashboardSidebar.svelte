<script lang="ts">
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import type { ComponentProps } from 'svelte';
	import NavUser from './NavUser.svelte';
	import NavMain from './NavMain.svelte';
	import NavModeToggle from './NavModeToggle.svelte';
	import { getOrganization } from '$lib/api/organization.remote';
	import TrophyIcon from '@lucide/svelte/icons/trophy';
	import ShieldIcon from '@lucide/svelte/icons/shield';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

	let {
		ref = $bindable(null),
		collapsible = 'icon',
		...restProps
	}: ComponentProps<typeof Sidebar.Root> = $props();

	const org = await getOrganization();

	const iconMap: Record<(typeof org)['type'], typeof TrophyIcon> = {
		league: TrophyIcon,
		team: ShieldIcon,
	};

	const HeaderIcon = $derived(iconMap[org.type]);
</script>

<Sidebar.Root bind:ref {collapsible} {...restProps}>
	<Sidebar.Header>
		<Sidebar.MenuButton onclick={() => goto(resolve('/dashboard'))}>
			<HeaderIcon />
			<div class="grid flex-1 text-start text-sm leading-tight">
				<span class="truncate leading-tight font-medium">
					{org.name}
				</span>
				<span class="capitalize text-xs text-muted-foreground">
					{org.type}
				</span>
			</div>
		</Sidebar.MenuButton>
	</Sidebar.Header>
	<Sidebar.Content>
		<NavMain />
	</Sidebar.Content>
	<Sidebar.Footer>
		<NavModeToggle />
		<NavUser />
	</Sidebar.Footer>
	<Sidebar.Rail />
</Sidebar.Root>
