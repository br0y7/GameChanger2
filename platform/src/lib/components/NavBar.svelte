<script lang="ts">
	import { resolve } from '$app/paths';
	import { PUBLIC_APP_NAME } from '$env/static/public';
	import { isAuthenticated, requireUser } from '$lib/api/auth.remote';
	import { buttonVariants } from '$lib/components/ui/button';
	import * as Sheet from '$lib/components/ui/sheet';
	import MenuIcon from '@lucide/svelte/icons/menu';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';

	const navLinks = [
		{ label: 'Home', href: resolve('/') },
		{ label: 'Leagues', href: resolve('/leagues') },
		{ label: 'Standings', href: resolve('/standings') },
		{ label: 'Stats', href: resolve('/stats') },
		{ label: 'About', href: `${resolve('/')}#story` },
	];

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
			{#if await isAuthenticated()}
				{const user = await requireUser()}
				<span class="max-w-32 truncate text-sm text-[#8FA398]">{user.name}</span>
				<a
					href="/dashboard"
					class="rounded-md border border-white/15 px-3 py-2 text-sm font-medium text-[#E8F0EA] hover:border-[#B8E05C]/50"
				>
					Dashboard
				</a>
				<a href="/logout" class="px-2 text-sm text-[#8FA398] hover:text-[#E8F0EA]">Logout</a>
			{:else}
				<div class="relative">
					<button
						type="button"
						class="inline-flex items-center gap-1 rounded-md border border-white/15 px-3 py-2 text-sm font-semibold text-[#E8F0EA] transition-colors hover:border-[#B8E05C]/50"
						onclick={() => (loginOpen = !loginOpen)}
						aria-expanded={loginOpen}
					>
						Login
						<ChevronDownIcon class="size-4" />
					</button>
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
				<a
					href={resolve('/signup')}
					class="inline-flex items-center rounded-md bg-[#B8E05C] px-3 py-2 text-sm font-semibold text-[#0C1210] transition-colors hover:bg-[#C8E06A]"
				>
					Sign Up
				</a>
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
						{#if await isAuthenticated()}
							<a href="/dashboard" class="rounded-md px-3 py-2 text-sm hover:bg-[#151D19]"
								>Dashboard</a
							>
							<a href="/logout" class="rounded-md px-3 py-2 text-sm text-[#8FA398]">Logout</a>
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
							<a
								href={resolve('/signup')}
								class="mt-2 rounded-md bg-[#B8E05C] px-3 py-2 text-center text-sm font-semibold text-[#0C1210]"
							>
								Sign Up
							</a>
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
