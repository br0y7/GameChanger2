<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { getUser, isAuthenticated } from '$lib/api/auth.remote';
	import * as Avatar from '$lib/components/ui/avatar/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { useSidebar } from '$lib/components/ui/sidebar/index.js';
	import ChevronsUpDownIcon from '@lucide/svelte/icons/chevrons-up-down';
	import LogOutIcon from '@lucide/svelte/icons/log-out';
	import LogInIcon from '@lucide/svelte/icons/log-in';
	import SignUpIcon from '@lucide/svelte/icons/user-round-plus';
	import { page } from '$app/state';
	import { REDIRECT_TO_PARAM } from '$lib/utils/url';

	const user = (await getUser()) ?? { name: 'Guest', email: '', image: undefined };

	function getUserInitials() {
		const [first, second] = user.name.split(' ');

		let secondInitial = '';
		if (second) {
			secondInitial = second[0].toUpperCase();
		}

		return first[0].toUpperCase() + secondInitial;
	}
	const sidebar = useSidebar();
</script>

{#snippet dropdownLabel()}
	<DropdownMenu.Label class="p-0 font-normal">
		<div class="flex items-center gap-2 px-1 py-1.5 text-start text-sm">
			<Avatar.Root class="size-8 rounded-lg">
				<Avatar.Image src={user.image} alt={user.name} />
				<Avatar.Fallback class="rounded-lg">{getUserInitials()}</Avatar.Fallback>
			</Avatar.Root>
			<div class="grid flex-1 text-start text-sm leading-tight">
				<span class="truncate font-medium">{user.name}</span>
				<span class="truncate text-xs">{user.email}</span>
			</div>
		</div>
	</DropdownMenu.Label>
{/snippet}

<Sidebar.Menu>
	<Sidebar.MenuItem>
		<DropdownMenu.Root>
			<DropdownMenu.Trigger>
				{#snippet child({ props })}
					<Sidebar.MenuButton
						size="lg"
						class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
						{...props}
					>
						<Avatar.Root class="size-8 rounded-lg">
							<Avatar.Image src={user.image} alt={user.name} />
							<Avatar.Fallback class="rounded-lg">{getUserInitials()}</Avatar.Fallback>
						</Avatar.Root>
						<div class="grid flex-1 text-start text-sm leading-tight">
							<span class="truncate font-medium">{user.name}</span>
							<span class="truncate text-xs">{user.email}</span>
						</div>
						<ChevronsUpDownIcon class="ms-auto size-4" />
					</Sidebar.MenuButton>
				{/snippet}
			</DropdownMenu.Trigger>
			<DropdownMenu.Content
				class="w-(--bits-dropdown-menu-anchor-width) min-w-56 rounded-lg"
				side={sidebar.isMobile ? 'bottom' : 'right'}
				align="end"
				sideOffset={4}
			>
				{#if await isAuthenticated()}
					{@render dropdownLabel()}

					<DropdownMenu.Separator />
					<DropdownMenu.Item onclick={() => goto(resolve('/logout'))}>
						<LogOutIcon />
						Log out
					</DropdownMenu.Item>
				{:else}
					{@render dropdownLabel()}

					<DropdownMenu.Separator />
					{const searchParams = new URLSearchParams({ [REDIRECT_TO_PARAM]: page.url.pathname })}
					<DropdownMenu.Item onclick={() => goto(resolve(`/login?${searchParams}`))}>
						<LogInIcon />
						Log in
					</DropdownMenu.Item>
					<DropdownMenu.Item onclick={() => goto(resolve('/signup'))}>
						<SignUpIcon />
						Sign Up
					</DropdownMenu.Item>
				{/if}
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	</Sidebar.MenuItem>
</Sidebar.Menu>
