<script lang="ts">
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import CalendarDaysIcon from '@lucide/svelte/icons/calendar-days';
	import SettingsIcon from '@lucide/svelte/icons/settings';
	import HouseIcon from '@lucide/svelte/icons/house';
	import UploadIcon from '@lucide/svelte/icons/upload';
	import { resolve } from '$app/paths';
	import { isAuthenticated, isUserAdmin } from '$lib/api/auth.remote';
	import type { Organization } from '$lib/server/db/auth-schema';
	import NavItem from './NavItem.svelte';

	let { org }: { org: Organization } = $props();
</script>

<Sidebar.Group>
	<Sidebar.Menu>
		<NavItem label="Overview" href={resolve('/dashboard/[orgSlug]', { orgSlug: org.slug })}>
			{#snippet icon()}
				<HouseIcon />
			{/snippet}
		</NavItem>

		{#if org.type === 'league'}
			<NavItem
				label="Seasons"
				href={resolve('/dashboard/[orgSlug]/seasons', { orgSlug: org.slug })}
			>
				{#snippet icon()}
					<CalendarDaysIcon />
				{/snippet}
			</NavItem>
		{/if}

		{#if await isUserAdmin()}
			<NavItem
				label="Import Spreadsheet"
				href={resolve('/dashboard/[orgSlug]/import', { orgSlug: org.slug })}
			>
				{#snippet icon()}
					<UploadIcon />
				{/snippet}
			</NavItem>
		{/if}

		{#if await isAuthenticated()}
			<NavItem
				label="Settings"
				href={resolve('/dashboard/[orgSlug]/settings', { orgSlug: org.slug })}
			>
				{#snippet icon()}
					<SettingsIcon />
				{/snippet}
			</NavItem>
		{/if}
	</Sidebar.Menu>
</Sidebar.Group>
