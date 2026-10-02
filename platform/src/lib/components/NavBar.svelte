<script lang="ts">
	import { resolve } from '$app/paths';
	import { PUBLIC_APP_NAME } from '$env/static/public';
	import { getPostLoginRedirect, getUser } from '$lib/api/auth.remote';
	import { getDemoAccess } from '$lib/api/demo.remote';
	import { Button, buttonVariants } from '$lib/components/ui/button';
	import * as Sheet from '$lib/components/ui/sheet';
	import MenuIcon from '@lucide/svelte/icons/menu';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';

	const navLinks = [
		{ label: 'Home', href: resolve('/') },
		{ label: 'Games', href: resolve('/games') },
		{ label: 'Standings', href: resolve('/standings') },
		{ label: 'Stats', href: resolve('/stats') },
		{ label: 'Teams', href: resolve('/teams') },
		{ label: 'About', href: `${resolve('/')}#story` },
	];

	const demo = $derived(await getDemoAccess());
	const user = $derived(demo ? null : await getUser());
	const dashboardHref = $derived(user ? await getPostLoginRedirect({}) : resolve('/dashboard'));
	const exitDemoHref = resolve('/demo/exit');

	let loginOpen = $state(false);
</script>

<nav
	class="sticky top-0 z-50 border-b border-white/10 bg-[#0C1210]/90 text-[#E8F0EA] backdrop-blur-md"
	style="font-family: Figtree, system-ui, sans-serif"
>
	<div class="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
		<a
			href={resolve('/')}
			class="shrink-0 text-lg font-bold tracking-[0.08em] text-[#E8F0EA] uppercase"
			style="font-family: 'Barlow Condensed', system-ui, sans-serif"
		>
			{PUBLIC_APP_NAME}
		</a>

		<div class="hidden items-center gap-1 lg:flex">
			{#each navLinks as link (link.label)}
				<a
					href={link.href}
					class="rounded-md px-2.5 py-1.5 text-sm font-medium text-[#8FA398] transition-colors hover:text-[#E8F0EA]"
				>
					{link.label}
				</a>
			{/each}
		</div>

		<div class="hidden items-center gap-2 md:flex">
			{#if demo}
				<Button variant="outline" href={exitDemoHref} data-sveltekit-reload>Exit demo</Button>
			{:else if user}
				<span class="max-w-32 truncate text-sm text-[#8FA398]">{user.name}</span>
				<Button variant="outline" href={dashboardHref} data-sveltekit-reload>Dashboard</Button>
				<Button
					variant="ghost"
					href={resolve('/logout')}
					class="text-[#8FA398]"
					data-sveltekit-reload>Logout</Button
				>
			{:else}
				<div class="relative">
					<Button
						variant="outline"
						onclick={() => (loginOpen = !loginOpen)}
						aria-expanded={loginOpen}
					>
						Login
						<ChevronDownIcon class="size-4" />
					</Button>
					{#if loginOpen}
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<div
							class="absolute right-0 z-50 mt-2 w-48 overflow-hidden rounded-lg border border-white/10 bg-[#151D19] shadow-lg"
							onmouseleave={() => (loginOpen = false)}
						>
							<a
								href={resolve('/login')}
								class="block px-3 py-2.5 text-sm text-[#E8F0EA] hover:bg-[#1C2621]"
								onclick={() => (loginOpen = false)}
							>
								League Admin
							</a>
							<a
								href={resolve('/login')}
								class="block px-3 py-2.5 text-sm text-[#E8F0EA] hover:bg-[#1C2621]"
								onclick={() => (loginOpen = false)}
							>
								Coach
							</a>
							<a
								href={resolve('/login')}
								class="block px-3 py-2.5 text-sm text-[#E8F0EA] hover:bg-[#1C2621]"
								onclick={() => (loginOpen = false)}
							>
								Player / Family
							</a>
						</div>
					{/if}
				</div>
				<Button
					href={resolve('/signup')}
					class="bg-[#B8E05C] font-semibold text-[#0C1210] hover:bg-[#C8E06A]"
				>
					Sign Up
				</Button>
			{/if}
		</div>

		<div class="flex items-center gap-1 md:hidden">
			<Sheet.Root>
				<Sheet.Trigger
					class={buttonVariants({ size: 'icon', variant: 'ghost' }) + ' text-[#E8F0EA]'}
				>
					<MenuIcon class="h-5 w-5" />
				</Sheet.Trigger>
				<Sheet.Content side="right" class="border-white/10 bg-[#0C1210] text-[#E8F0EA]">
					<Sheet.Header>
						<Sheet.Title class="text-[#E8F0EA]">{PUBLIC_APP_NAME}</Sheet.Title>
						<Sheet.Description class="text-[#8FA398]">
							Youth sports development platform
						</Sheet.Description>
					</Sheet.Header>
					<div class="mx-4 flex flex-col gap-1">
						{#each navLinks as link (link.label)}
							<a
								href={link.href}
								class="rounded-md px-3 py-2 text-sm font-medium text-[#E8F0EA] hover:bg-[#151D19]"
							>
								{link.label}
							</a>
						{/each}
						{#if demo}
							<a
								href={exitDemoHref}
								data-sveltekit-reload
								class="rounded-md px-3 py-2 text-sm hover:bg-[#151D19]">Exit demo</a
							>
						{:else if user}
							<a
								href={dashboardHref}
								data-sveltekit-reload
								class="rounded-md px-3 py-2 text-sm hover:bg-[#151D19]">Dashboard</a
							>
							<a
								href={resolve('/logout')}
								data-sveltekit-reload
								class="rounded-md px-3 py-2 text-sm text-[#8FA398]">Logout</a
							>
						{:else}
							<p class="mt-3 px-3 text-xs font-semibold tracking-wide text-[#8FA398] uppercase">
								Login as
							</p>
							<a href={resolve('/login')} class="rounded-md px-3 py-2 text-sm hover:bg-[#151D19]"
								>League Admin</a
							>
							<a href={resolve('/login')} class="rounded-md px-3 py-2 text-sm hover:bg-[#151D19]"
								>Coach</a
							>
							<a href={resolve('/login')} class="rounded-md px-3 py-2 text-sm hover:bg-[#151D19]"
								>Player / Family</a
							>
							<Button
								href={resolve('/signup')}
								class="mt-2 bg-[#B8E05C] font-semibold text-[#0C1210] hover:bg-[#C8E06A]"
							>
								Sign Up
							</Button>
						{/if}
					</div>
					<Sheet.Footer>
						<Sheet.Close class={buttonVariants({ variant: 'outline' })}>Close</Sheet.Close>
					</Sheet.Footer>
				</Sheet.Content>
			</Sheet.Root>
		</div>
	</div>
</nav>
