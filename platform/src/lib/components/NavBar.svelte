<script lang="ts">
	import { resolve } from '$app/paths';
	import { PUBLIC_APP_NAME } from '$env/static/public';
	import { isAuthenticated, requireUser } from '$lib/api/auth.remote';
	import { Button, buttonVariants } from '$lib/components/ui/button';
	import * as Sheet from '$lib/components/ui/sheet';
	import MenuIcon from '@lucide/svelte/icons/menu';
	import ModeToggle from './ui/ModeToggle.svelte';
	import { page } from '$app/state';
</script>

<nav class="border-b bg-background sticky top-0">
	<div class="flex h-16 items-center justify-between px-4">
		<div>
			<a href={resolve('/')} class="text-xl font-bold">
				<!-- Insert the logo here -->
				{PUBLIC_APP_NAME}
			</a>

			<span class="hidden md:inline-block">
				<Button variant="ghost" href="/dashboard">Dashboard</Button>
			</span>
		</div>
		<div class="hidden items-center gap-2 md:flex">
			{#if await isAuthenticated()}
				{const user = await requireUser()}
				<span>{user.name}</span>
				<Button variant="outline" href="/logout">Logout</Button>
			{:else}
				{#if !page.url.pathname.startsWith('/login')}
					<Button variant="ghost" href="/login">Login</Button>
				{/if}

				{#if !page.url.pathname.startsWith('/signup')}
					<Button href="/signup">Sign Up</Button>
				{/if}
			{/if}

			<ModeToggle />
		</div>

		<div class="md:hidden">
			<ModeToggle />
			<Sheet.Root>
				<Sheet.Trigger>
					<Button size="icon" variant="ghost">
						<MenuIcon class="h-5 w-5" />
					</Button>
				</Sheet.Trigger>

				<Sheet.Content side="right">
					<Sheet.Header>
						<Sheet.Title>
							{#if await isAuthenticated()}
								{const user = await requireUser()}
								<span class="max-w-1/4 truncate">
									Hi, {user.name}
								</span>
							{:else}
								{PUBLIC_APP_NAME}
							{/if}
						</Sheet.Title>
						<Sheet.Description>
							{#if await isAuthenticated()}
								Welcome back to {PUBLIC_APP_NAME}
							{:else}
								Sign up or log in to start using {PUBLIC_APP_NAME}
							{/if}
						</Sheet.Description>
					</Sheet.Header>
					<div class="mx-4 flex flex-col gap-2">
						<Button variant="ghost" href="/">Home</Button>

						{#if await isAuthenticated()}
							<Button variant="ghost" href="/dashboard">Dashboard</Button>

							<Button variant="outline" href="/logout">Logout</Button>
						{:else}
							{#if !page.url.pathname.startsWith('/login')}
								<Button variant="outline" href="/login">Login</Button>
							{/if}

							{#if !page.url.pathname.startsWith('/signup')}
								<Button href="/signup">Sign Up</Button>
							{/if}
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
