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
	import type { Organization } from '$lib/server/db/schema';

	interface Props extends ComponentProps<typeof Sidebar.Root> {
		orgSlug: string;
	}
	let { ref = $bindable(null), collapsible = 'icon', orgSlug, ...restProps }: Props = $props();

	const iconMap: Record<Organization['type'], typeof TrophyIcon> = {
		league: TrophyIcon,
		team: UsersIcon,
		system: ShieldIcon,
	};
</script>

<Sidebar.Root bind:ref {collapsible} {...restProps}>
	{const org = await getOrganization({ slug: orgSlug })}
	<Sidebar.Header>
		<Sidebar.MenuButton>
			{#snippet child({ props })}
				<a href={resolve('/dashboard')} {...props}>
					{const HeaderIcon = iconMap[org.type]}
					<HeaderIcon class="shrink-0" />
					<div class="flex flex-col truncate">
						<span class="truncate leading-tight font-medium">
							{org.name}
						</span>
						<span class="text-xs text-muted-foreground capitalize">
							{org.type}
						</span>
					</div>
				</a>
			{/snippet}
		</Sidebar.MenuButton>
	</Sidebar.Header>
	<Sidebar.Content>
		<NavMain {org} />
	</Sidebar.Content>
	<Sidebar.Footer>
		<NavModeToggle />
		<NavUser />
	</Sidebar.Footer>
	<Sidebar.Rail />
</Sidebar.Root>
