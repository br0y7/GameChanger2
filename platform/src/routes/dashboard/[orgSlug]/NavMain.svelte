<script lang="ts">
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import CalendarDaysIcon from '@lucide/svelte/icons/calendar-days';
	import SettingsIcon from '@lucide/svelte/icons/settings';
	import HouseIcon from '@lucide/svelte/icons/house';
	import UploadIcon from '@lucide/svelte/icons/upload';
	import { resolve } from '$app/paths';
	import { isUserLeagueOrganizer } from '$lib/api/league.remote';
	import { isAuthenticated, isUserAdmin } from '$lib/api/auth.remote';
	import type { ResolvedPathname } from '$app/types';
	import { page } from '$app/state';

	interface NavItem {
		label: string;
		getURL: () => ResolvedPathname;
		icon: typeof HouseIcon;
	}

	export const navigationItems: NavItem[] = [
		{
			label: 'Overview',
			getURL: () => resolve('/dashboard/[orgSlug]', { orgSlug: page.params.orgSlug! }),
			icon: HouseIcon,
		},
	];

	if (await isUserLeagueOrganizer()) {
		navigationItems.push({
			label: 'Seasons',
			getURL: () => resolve('/dashboard/[orgSlug]/seasons', { orgSlug: page.params.orgSlug! }),
			icon: CalendarDaysIcon,
		});
	}

	if (await isUserAdmin()) {
		navigationItems.push({
			label: 'Import Spreadsheet',
			getURL: () => resolve('/dashboard/[orgSlug]/import', { orgSlug: page.params.orgSlug! }),
			icon: UploadIcon,
		});
	}

	if (await isAuthenticated()) {
		navigationItems.push({
			label: 'Settings',
			getURL: () => resolve('/dashboard/[orgSlug]/settings', { orgSlug: page.params.orgSlug! }),
			icon: SettingsIcon,
		});
	}
</script>

<Sidebar.Group>
	<Sidebar.Menu>
		{#each navigationItems as item (item.getURL())}
			<Sidebar.MenuButton tooltipContent={item.label}>
				{#snippet child({ props })}
					<a href={item.getURL()} {...props}>
						<item.icon />
						<span>{item.label}</span>
					</a>
				{/snippet}
			</Sidebar.MenuButton>
		{/each}
	</Sidebar.Menu>
</Sidebar.Group>
