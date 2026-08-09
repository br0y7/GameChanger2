<script lang="ts">
	import ChevronsUpDownIcon from '@lucide/svelte/icons/chevrons-up-down';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { useSidebar } from '$lib/components/ui/sidebar/index.js';
	import { getOrganization, getOrganizations } from '$lib/api/organization.remote';
	import { resolve } from '$app/paths';
	import { getUser } from '$lib/api/auth.remote';
	import TrophyIcon from '@lucide/svelte/icons/trophy';
	import UsersIcon from '@lucide/svelte/icons/users';
	import ShieldIcon from '@lucide/svelte/icons/shield';
	import type { Organization } from '$lib/server/db/schema';
	import { goto } from '$app/navigation';
	import { authClient } from '$lib/auth-client';

	interface Props {
		orgSlug: string;
	}
	let { orgSlug }: Props = $props();
	const sidebar = useSidebar();

	const iconMap: Record<Organization['type'], typeof TrophyIcon> = {
		league: TrophyIcon,
		team: UsersIcon,
		system: ShieldIcon,
	};

	const user = await getUser();
	const userOrganizations = user ? await getOrganizations({ userId: user.id }) : [];
</script>

{#snippet menuButtonContent()}
	{const org = await getOrganization({ slug: orgSlug })}
	<div
		class="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground"
	>
		{const HeaderIcon = iconMap[org.type]}
		<HeaderIcon class="shrink-0" />
	</div>
	<div class="grid flex-1 text-start text-sm leading-tight">
		<span class="truncate font-medium">
			{org.name}
		</span>
		<span class="truncate text-xs text-muted-foreground capitalize">
			{org.type}
		</span>
	</div>
{/snippet}

<Sidebar.Menu>
	{#if userOrganizations.length > 1}
		<Sidebar.MenuItem>
			<DropdownMenu.Root>
				<DropdownMenu.Trigger>
					{#snippet child({ props })}
						<Sidebar.MenuButton
							{...props}
							size="lg"
							class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
						>
							{@render menuButtonContent()}
							<ChevronsUpDownIcon class="ms-auto" />
						</Sidebar.MenuButton>
					{/snippet}
				</DropdownMenu.Trigger>
				<DropdownMenu.Content
					class="w-(--bits-dropdown-menu-anchor-width) min-w-56 rounded-lg"
					align="start"
					side={sidebar.isMobile ? 'bottom' : 'right'}
					sideOffset={4}
				>
					<DropdownMenu.Label class="text-xs text-muted-foreground">
						Organizations
					</DropdownMenu.Label>
					{#each userOrganizations as org (org.id)}
						<DropdownMenu.Item
							onSelect={async () => {
								sidebar.setOpenMobile(false);

								await authClient.organization.setActive({ organizationId: org.id });

								await goto(resolve('/dashboard/[orgSlug]', { orgSlug: org.slug }));
							}}
							class="gap-2 p-2"
						>
							<div class="flex size-6 items-center justify-center rounded-md border">
								{const HeaderIcon = iconMap[org.type]}
								<HeaderIcon class="shrink-0" />
							</div>
							{org.name}
						</DropdownMenu.Item>
					{/each}
				</DropdownMenu.Content>
			</DropdownMenu.Root>
		</Sidebar.MenuItem>
	{:else}
		<Sidebar.MenuButton
			size="lg"
			class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
		>
			{#snippet child({ props })}
				<a
					href={userOrganizations.length === 1
						? resolve('/dashboard/[orgSlug]', { orgSlug })
						: resolve('/')}
					{...props}
				>
					{@render menuButtonContent()}
				</a>
			{/snippet}
		</Sidebar.MenuButton>
	{/if}
</Sidebar.Menu>
