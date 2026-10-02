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
	import { loadPage } from '$lib/navigation/load-page';
	import { isUserAdmin } from '$lib/api/auth.remote';
	import { getAdminViewAs, setAdminViewAs } from '$lib/api/view-as.remote';
	import { exitDemo, getDemoAccess } from '$lib/api/demo.remote';

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
	const demoHomeHref = $derived(resolve('/dashboard/[orgSlug]', { orgSlug: params.orgSlug }));
	const onDemoHome = $derived(
		page.url.pathname.replace(/\/$/, '') === demoHomeHref.replace(/\/$/, '')
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
	const pathSegments = $derived(page.url.pathname.split('/').filter(Boolean));
	const portalAt = $derived(pathSegments.indexOf('portal'));
	/** Coach team pages. A full page load (how admins enter this view) has no in-app history. */
	const onCoachTeam = $derived(portalAt !== -1 && pathSegments.length > portalAt + 1);
	const coachTeamsHref = $derived(
		resolve('/dashboard/[orgSlug]/portal', { orgSlug: params.orgSlug })
	);
	const isAdmin = $derived(await isUserAdmin());
	const demo = $derived(await getDemoAccess());
	const viewAs = $derived(await getAdminViewAs());
	let leavingPreview = $state(false);
	let leavingDemo = $state(false);

	async function leavePreview() {
		if (leavingPreview) return;
		leavingPreview = true;
		try {
			await setAdminViewAs({ mode: 'admin' });
			await getAdminViewAs().refresh();
			loadPage(resolve('/dashboard/[orgSlug]', { orgSlug: params.orgSlug }));
		} finally {
			leavingPreview = false;
		}
	}

	async function leaveDemo() {
		if (leavingDemo) return;
		leavingDemo = true;
		try {
			await exitDemo();
			await getDemoAccess().refresh();
			loadPage(resolve('/'));
		} finally {
			leavingDemo = false;
		}
	}
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
				{#if demo}
					{#if !onDemoHome}
						<Button variant="ghost" href={demoHomeHref}>
							<ArrowLeft />
							Demo home
						</Button>
					{/if}
				{:else}
					<Button variant="ghost" href={resolve('/')} data-sveltekit-reload>
						<HouseIcon />
						Home
					</Button>
				{/if}
				{#if onFamilyPlayer}
					<Button variant="ghost" href={allPlayersHref}>
						<ArrowLeft />
						All players
					</Button>
				{:else if (isAdmin || demo) && onCoachTeam}
					<Button variant="ghost" href={coachTeamsHref}>
						<ArrowLeft />
						All teams
					</Button>
				{:else if !demo && showBackButton}
					<Button variant="ghost" onclick={() => history.back()}>
						<ArrowLeft />
						Back
					</Button>
				{/if}
			</div>
		</header>
		{#if demo}
			<div
				class="flex flex-wrap items-center justify-between gap-2 border-y border-[#58A6FF]/40 bg-[#58A6FF]/10 px-4 py-2"
			>
				<p class="text-sm text-[#E6EDF3]">
					<span class="font-semibold text-[#58A6FF]">Demo</span>
					· View-only preview of player dashboards, coach dashboards, and stats for {demo.orgName}.
				</p>
				<Button variant="outline" size="sm" onclick={leaveDemo} disabled={leavingDemo}>
					{leavingDemo ? 'Leaving…' : 'Exit demo'}
				</Button>
			</div>
		{:else if viewAs !== 'admin'}
			<div
				class="flex flex-wrap items-center justify-between gap-2 border-y border-[#F0A020]/40 bg-[#F0A020]/10 px-4 py-2"
			>
				<p class="text-sm text-[#E6EDF3]">
					<span class="font-semibold text-[#F0A020]">Admin preview</span>
					· You are seeing the {viewAs === 'coach' ? 'coach' : 'player'} dashboard as they see it. Your
					admin access has not changed.
				</p>
				<Button variant="outline" size="sm" onclick={leavePreview} disabled={leavingPreview}>
					{leavingPreview ? 'Leaving…' : 'Back to admin view'}
				</Button>
			</div>
		{/if}
		<main class="min-h-[calc(100svh-4rem)] bg-[#0D1117] text-[#E6EDF3]">
			{@render children()}
		</main>
		{#if !demo}
			<AskAiAssistant />
		{/if}
	</Sidebar.Inset>
</Sidebar.Provider>
