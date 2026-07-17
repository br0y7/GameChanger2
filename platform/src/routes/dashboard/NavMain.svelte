<script lang="ts">
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import CalendarDaysIcon from '@lucide/svelte/icons/calendar-days';
	import SettingsIcon from '@lucide/svelte/icons/settings';
	import HouseIcon from '@lucide/svelte/icons/house';
	import { getOrganization } from '$lib/api/organization.remote';
	import { resolve } from '$app/paths';
	import type { Pathname } from '$app/types';
	import { isUserLeagueOrganizer } from '$lib/api/league.remote';

	interface NavItem {
		label: string;
		href: Pathname;
		icon: typeof HouseIcon;
	}

	export const navigationItems: NavItem[] = [
		{ label: 'Overview', href: '/dashboard', icon: HouseIcon },
	];

	if (await isUserLeagueOrganizer()) {
		navigationItems.push({ label: 'Seasons', href: '/dashboard/seasons', icon: CalendarDaysIcon });
	}

	navigationItems.push({ label: 'Settings', href: '/dashboard/settings', icon: SettingsIcon });

	const org = await getOrganization();
</script>

<Sidebar.Group>
	<Sidebar.Menu>
		{#if org.type === 'league'}
			{#each navigationItems as item (item.href)}
				<Sidebar.MenuButton tooltipContent={item.label}>
					{#snippet child({ props })}
						<a href={resolve(item.href)} {...props}>
							<item.icon />
							<span>{item.label}</span>
						</a>
					{/snippet}
				</Sidebar.MenuButton>
			{/each}
		{/if}
	</Sidebar.Menu>
</Sidebar.Group>
