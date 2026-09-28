<script lang="ts">
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import CalendarDaysIcon from '@lucide/svelte/icons/calendar-days';
	import SettingsIcon from '@lucide/svelte/icons/settings';
	import HouseIcon from '@lucide/svelte/icons/house';
	import UploadIcon from '@lucide/svelte/icons/upload';
	import UsersIcon from '@lucide/svelte/icons/users';
	import UserIcon from '@lucide/svelte/icons/user';
	import TrophyIcon from '@lucide/svelte/icons/trophy';
	import ExternalLinkIcon from '@lucide/svelte/icons/external-link';
	import ShieldIcon from '@lucide/svelte/icons/shield';
	import EyeIcon from '@lucide/svelte/icons/eye';
	import { resolve } from '$app/paths';
	import type { ResolvedPathname } from '$app/types';
	import { goto } from '$app/navigation';
	import { isAuthenticated, isUserAdmin } from '$lib/api/auth.remote';
	import { isCoachOnlyUser } from '$lib/api/coach-nav.remote';
	import { isFamilyOnlyUser } from '$lib/api/family-nav.remote';
	import { getOrganization, goToAdminDashboard } from '$lib/api/organization.remote';
	import { getCurrentSeason } from '$lib/api/season.remote';
	import { getAdminViewAs, setAdminViewAs } from '$lib/api/view-as.remote';
	import type { AdminViewMode } from '$lib/api/view-as';
	import NavItem from './NavItem.svelte';

	let { orgSlug }: { orgSlug: string } = $props();

	const org = $derived(await getOrganization({ slug: orgSlug }));
	const currentSeason = $derived(
		org.type === 'league' ? await getCurrentSeason({ organizationId: org.id }) : null
	);
	const isAdmin = $derived(await isUserAdmin());
	const viewAs = $derived(await getAdminViewAs());
	/** An admin previewing a dashboard gets that dashboard's menu instead of their own. */
	const coachOnly = $derived((await isCoachOnlyUser()) || viewAs === 'coach');
	const familyOnly = $derived((await isFamilyOnlyUser()) || viewAs === 'family');
	const sidebar = Sidebar.useSidebar();
	let goingToAdmin = $state(false);
	let switchingView = $state(false);

	async function switchView(mode: AdminViewMode, href: ResolvedPathname) {
		if (switchingView) return;
		sidebar.setOpenMobile(false);
		switchingView = true;
		try {
			await setAdminViewAs({ mode });
			await getAdminViewAs().refresh();
			await goto(href);
		} finally {
			switchingView = false;
		}
	}

	const statsHref = $derived(
		currentSeason
			? resolve('/dashboard/[orgSlug]/seasons/[seasonSlug]/stats', {
					orgSlug,
					seasonSlug: currentSeason.slug,
				})
			: resolve('/dashboard/[orgSlug]', { orgSlug })
	);
</script>

{#snippet backToAdmin()}
	<Sidebar.Group>
		<Sidebar.GroupLabel>Admin preview</Sidebar.GroupLabel>
		<Sidebar.Menu>
			<Sidebar.MenuItem>
				<Sidebar.MenuButton
					tooltipContent="Back to admin view"
					aria-disabled={switchingView}
					onclick={() => switchView('admin', resolve('/dashboard/[orgSlug]', { orgSlug }))}
				>
					<ShieldIcon />
					<span>{switchingView ? 'Switching…' : 'Back to admin view'}</span>
				</Sidebar.MenuButton>
			</Sidebar.MenuItem>
		</Sidebar.Menu>
	</Sidebar.Group>
{/snippet}

{#if org.type === 'league' && familyOnly}
	{#if viewAs === 'family'}
		{@render backToAdmin()}
	{/if}
	<Sidebar.Group>
		<Sidebar.GroupLabel>Family Portal</Sidebar.GroupLabel>
		<Sidebar.Menu>
			<NavItem label="My Player" href={resolve('/dashboard/[orgSlug]/family', { orgSlug })}>
				{#snippet icon()}
					<UserIcon />
				{/snippet}
			</NavItem>
			<NavItem label="Season Stats" href={statsHref}>
				{#snippet icon()}
					<TrophyIcon />
				{/snippet}
			</NavItem>
		</Sidebar.Menu>
	</Sidebar.Group>

	{#if await isAuthenticated()}
		<Sidebar.Group>
			<Sidebar.Menu>
				<NavItem label="Settings" href={resolve('/dashboard/[orgSlug]/settings', { orgSlug })}>
					{#snippet icon()}
						<SettingsIcon />
					{/snippet}
				</NavItem>
			</Sidebar.Menu>
		</Sidebar.Group>
	{/if}
{:else if org.type === 'league' && coachOnly}
	{#if viewAs === 'coach'}
		{@render backToAdmin()}
	{/if}
	<Sidebar.Group>
		<Sidebar.GroupLabel>Coach Portal</Sidebar.GroupLabel>
		<Sidebar.Menu>
			<NavItem label="My Teams" href={resolve('/dashboard/[orgSlug]/portal', { orgSlug })}>
				{#snippet icon()}
					<HouseIcon />
				{/snippet}
			</NavItem>
		</Sidebar.Menu>
	</Sidebar.Group>

	{#if await isAuthenticated()}
		<Sidebar.Group>
			<Sidebar.Menu>
				<NavItem label="Settings" href={resolve('/dashboard/[orgSlug]/settings', { orgSlug })}>
					{#snippet icon()}
						<SettingsIcon />
					{/snippet}
				</NavItem>
			</Sidebar.Menu>
		</Sidebar.Group>
	{/if}
{:else if org.type === 'league'}
	{#if isAdmin}
		<Sidebar.Group>
			<Sidebar.GroupLabel>Admin</Sidebar.GroupLabel>
			<Sidebar.Menu>
				<Sidebar.MenuItem>
					<Sidebar.MenuButton
						tooltipContent="Admin dashboard"
						aria-disabled={goingToAdmin}
						onclick={async () => {
							if (goingToAdmin) return;
							sidebar.setOpenMobile(false);
							goingToAdmin = true;
							try {
								const result = await goToAdminDashboard();
								await getAdminViewAs().refresh();
								await goto(resolve('/dashboard/[orgSlug]', { orgSlug: result.slug }));
							} finally {
								goingToAdmin = false;
							}
						}}
					>
						<ShieldIcon />
						<span>{goingToAdmin ? 'Opening…' : 'Admin dashboard'}</span>
					</Sidebar.MenuButton>
				</Sidebar.MenuItem>
				<NavItem
					label="Import Spreadsheet"
					href={resolve('/dashboard/[orgSlug]/import', { orgSlug })}
				>
					{#snippet icon()}
						<UploadIcon />
					{/snippet}
				</NavItem>
				<Sidebar.MenuItem>
					<Sidebar.MenuButton
						tooltipContent="See the coach dashboard as a coach sees it"
						aria-disabled={switchingView}
						onclick={() =>
							switchView('coach', resolve('/dashboard/[orgSlug]/portal', { orgSlug }))}
					>
						<EyeIcon />
						<span>View as coach</span>
					</Sidebar.MenuButton>
				</Sidebar.MenuItem>
				<Sidebar.MenuItem>
					<Sidebar.MenuButton
						tooltipContent="See the player dashboard as a player sees it"
						aria-disabled={switchingView}
						onclick={() =>
							switchView('family', resolve('/dashboard/[orgSlug]/family', { orgSlug }))}
					>
						<EyeIcon />
						<span>View as player</span>
					</Sidebar.MenuButton>
				</Sidebar.MenuItem>
			</Sidebar.Menu>
		</Sidebar.Group>
	{/if}

	<Sidebar.Group>
		<Sidebar.GroupLabel>League Management</Sidebar.GroupLabel>
		<Sidebar.Menu>
			<NavItem label="Overview" href={resolve('/dashboard/[orgSlug]', { orgSlug })}>
				{#snippet icon()}
					<HouseIcon />
				{/snippet}
			</NavItem>
			<NavItem label="Seasons" href={resolve('/dashboard/[orgSlug]/seasons', { orgSlug })}>
				{#snippet icon()}
					<CalendarDaysIcon />
				{/snippet}
			</NavItem>
			<NavItem label="Teams" href={resolve('/dashboard/[orgSlug]/teams', { orgSlug })}>
				{#snippet icon()}
					<UsersIcon />
				{/snippet}
			</NavItem>
			<NavItem label="Players" href={resolve('/dashboard/[orgSlug]/players', { orgSlug })}>
				{#snippet icon()}
					<UserIcon />
				{/snippet}
			</NavItem>
			<NavItem label="Games" href={resolve('/dashboard/[orgSlug]/games', { orgSlug })}>
				{#snippet icon()}
					<TrophyIcon />
				{/snippet}
			</NavItem>
			<NavItem label="Coaches" href={resolve('/dashboard/[orgSlug]/coaches', { orgSlug })}>
				{#snippet icon()}
					<UsersIcon />
				{/snippet}
			</NavItem>
		</Sidebar.Menu>
	</Sidebar.Group>

	<Sidebar.Group>
		<Sidebar.GroupLabel>Stats & Data</Sidebar.GroupLabel>
		<Sidebar.Menu>
			<NavItem label="Stats Website" href={statsHref}>
				{#snippet icon()}
					<ExternalLinkIcon />
				{/snippet}
			</NavItem>
		</Sidebar.Menu>
	</Sidebar.Group>

	{#if await isAuthenticated()}
		<Sidebar.Group>
			<Sidebar.Menu>
				<NavItem label="Settings" href={resolve('/dashboard/[orgSlug]/settings', { orgSlug })}>
					{#snippet icon()}
						<SettingsIcon />
					{/snippet}
				</NavItem>
			</Sidebar.Menu>
		</Sidebar.Group>
	{/if}
{:else}
	<Sidebar.Group>
		<Sidebar.Menu>
			<NavItem label="Overview" href={resolve('/dashboard/[orgSlug]', { orgSlug })}>
				{#snippet icon()}
					<HouseIcon />
				{/snippet}
			</NavItem>

			{#if isAdmin}
				<NavItem label="Invites" href={resolve('/dashboard/[orgSlug]/invites', { orgSlug })}>
					{#snippet icon()}
						<UsersIcon />
					{/snippet}
				</NavItem>
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
{/if}
