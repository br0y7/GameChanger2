<script lang="ts">
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import ShieldIcon from '@lucide/svelte/icons/shield';
	import CalendarDaysIcon from '@lucide/svelte/icons/calendar-days';
	import SettingsIcon from '@lucide/svelte/icons/settings';
	import { getOrganization } from '$lib/api/organization.remote';
	import { resolve } from '$app/paths';
	import type { Pathname } from '$app/types';

	interface NavItem {
		label: string;
		href: Pathname;
		icon: typeof ShieldIcon;
	}

	export const leagueNavigation: NavItem[] = [
		{ label: 'Seasons', href: '/dashboard/seasons', icon: CalendarDaysIcon },
		{ label: 'Settings', href: '/dashboard/settings', icon: SettingsIcon },
	];

	const org = await getOrganization();
</script>

<Sidebar.Group>
	<Sidebar.Menu>
		{#if org.type === 'league'}
			{#each leagueNavigation as item (item.href)}
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
