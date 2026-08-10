<script lang="ts">
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import CalendarDaysIcon from '@lucide/svelte/icons/calendar-days';
	import SettingsIcon from '@lucide/svelte/icons/settings';
	import HouseIcon from '@lucide/svelte/icons/house';
	import UploadIcon from '@lucide/svelte/icons/upload';
	import { resolve } from '$app/paths';
	import { isAuthenticated, isUserAdmin } from '$lib/api/auth.remote';
	import NavItem from './NavItem.svelte';
	import { getOrganization } from '$lib/api/organization.remote';

	let { orgSlug }: { orgSlug: string } = $props();
</script>

<Sidebar.Group>
	<Sidebar.Menu>
		<NavItem label="Overview" href={resolve('/dashboard/[orgSlug]', { orgSlug })}>
			{#snippet icon()}
				<HouseIcon />
			{/snippet}
		</NavItem>

		{const org = $derived(await getOrganization({ slug: orgSlug }))}
		{#if org.type === 'league'}
			<NavItem label="Seasons" href={resolve('/dashboard/[orgSlug]/seasons', { orgSlug })}>
				{#snippet icon()}
					<CalendarDaysIcon />
				{/snippet}
			</NavItem>
		{/if}

		{#if await isUserAdmin()}
			<NavItem
				label="Import Spreadsheet"
				href={resolve('/dashboard/[orgSlug]/import', { orgSlug })}
			>
				{#snippet icon()}
					<UploadIcon />
				{/snippet}
			</NavItem>
		{/if}

		{#if await isAuthenticated()}
			<NavItem label="Settings" href={resolve('/dashboard/[orgSlug]/settings', { orgSlug })}>
				{#snippet icon()}
					<SettingsIcon />
				{/snippet}
			</NavItem>
		{/if}
	</Sidebar.Menu>
</Sidebar.Group>
