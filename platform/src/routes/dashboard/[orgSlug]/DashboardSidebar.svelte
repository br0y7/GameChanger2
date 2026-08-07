<script lang="ts">
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import type { ComponentProps } from 'svelte';
	import NavUser from './NavUser.svelte';
	import NavMain from './NavMain.svelte';
	import NavModeToggle from './NavModeToggle.svelte';
	import { getOrganization } from '$lib/api/organization.remote';
	import TrophyIcon from '@lucide/svelte/icons/trophy';
	import UsersIcon from '@lucide/svelte/icons/users';
	import ShieldIcon from '@lucide/svelte/icons/shield';
	import { resolve } from '$app/paths';

	let {
		ref = $bindable(null),
		collapsible = 'icon',
		...restProps
	}: ComponentProps<typeof Sidebar.Root> = $props();

	const org = $derived(await getOrganization());

	const iconMap: Record<(typeof org)['type'], typeof TrophyIcon> = {
		league: TrophyIcon,
		team: UsersIcon,
		system: ShieldIcon,
	};

	const HeaderIcon = $derived(iconMap[org.type]);
</script>

<Sidebar.Root bind:ref {collapsible} {...restProps}>
	<Sidebar.Header>
		<Sidebar.MenuButton>
			{#snippet child({ props })}
				<a href={resolve('/dashboard')} {...props}>
					<HeaderIcon class="shrink-0" />
					<div class="flex flex-col">
						<span class="truncate leading-tight font-medium">
							{org.name}
						</span>
						<span class="capitalize text-xs text-muted-foreground">
							{org.type}
						</span>
					</div>
				</a>
			{/snippet}
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
