<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button';
	import { appHistory, noteNavigation } from '$lib/navigation/app-history.svelte';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import type { LayoutProps } from './$types';
	import DashboardSidebar from './DashboardSidebar.svelte';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import HouseIcon from '@lucide/svelte/icons/house';
	import AskAiAssistant from '$lib/components/ask-ai/AskAiAssistant.svelte';
	import { resolve } from '$app/paths';

	// import * as Breadcrumb from '$lib/components/ui/breadcrumb/index.js';

	let { children, params }: LayoutProps = $props();

	afterNavigate(({ from, to }) => {
		const fromPath = from?.url.pathname ?? null;
		const toPath = to?.url.pathname ?? null;
		noteNavigation(!!fromPath && fromPath !== toPath);
	});

	const allPlayersHref = $derived(
		resolve('/dashboard/[orgSlug]/family', { orgSlug: params.orgSlug })
	);
	const onFamilyPlayer = $derived(
		page.url.pathname.includes('/family/') &&
			page.url.pathname.split('/').filter(Boolean).length > 3
	);
	const showBackButton = $derived(
		!onFamilyPlayer &&
			appHistory.canGoBack &&
			page.url.pathname.split('/').filter(Boolean).length > 2
	);
</script>

<Sidebar.Provider>
	<DashboardSidebar orgSlug={params.orgSlug} />
	<Sidebar.Inset>
		<header
			class="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12"
		>
			<div class="flex items-center gap-1 px-4">
				<Sidebar.Trigger class="-ms-1" />
				<Separator orientation="vertical" class="me-2 data-[orientation=vertical]:h-4" />
				<!-- TODO: Add Breadcrumbs, the child pages uses context 
				Replaces this back button -->
				<Button variant="ghost" href={resolve('/')}>
					<HouseIcon />
					Home
				</Button>
				{#if onFamilyPlayer}
					<Button variant="ghost" href={allPlayersHref}>
						<ArrowLeft />
						All players
					</Button>
				{:else if showBackButton}
					<Button variant="ghost" onclick={() => history.back()}>
						<ArrowLeft />
						Back
					</Button>
				{/if}
			</div>
		</header>
		<main class="min-h-[calc(100svh-4rem)] bg-[#0D1117] text-[#E6EDF3]">
			{@render children()}
		</main>
		<AskAiAssistant />
	</Sidebar.Inset>
</Sidebar.Provider>
