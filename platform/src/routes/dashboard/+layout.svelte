<script lang="ts">
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import DashboardSidebar from './DashboardSidebar.svelte';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';

	// import * as Breadcrumb from '$lib/components/ui/breadcrumb/index.js';

	let { children } = $props();

	const showBackButton = page.url.pathname.split('/').filter(Boolean).length > 2;
</script>

<Sidebar.Provider>
	<DashboardSidebar />
	<Sidebar.Inset>
		<header
			class="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12"
		>
			<div class="flex items-center gap-1 px-4">
				<Sidebar.Trigger class="-ms-1" />
				<Separator orientation="vertical" class="me-2 data-[orientation=vertical]:h-4" />
				<!-- TODO: Add Breadcrumbs, the child pages uses context 
				Replaces this back button -->
				{#if showBackButton}
					<Button variant="ghost" onclick={() => history.back()}>
						<ArrowLeft />
						Back
					</Button>
				{/if}
				<!-- <Breadcrumb.Root>
					<Breadcrumb.List>
						<Breadcrumb.Item class="hidden md:block">
							<Breadcrumb.Link href="##">Build Your Application</Breadcrumb.Link>
						</Breadcrumb.Item>
						<Breadcrumb.Separator class="hidden md:block" />
						<Breadcrumb.Item>
							<Breadcrumb.Page>Data Fetching</Breadcrumb.Page>
						</Breadcrumb.Item>
					</Breadcrumb.List>
				</Breadcrumb.Root> -->
			</div>
		</header>
		<main>
			{@render children()}
		</main>
	</Sidebar.Inset>
</Sidebar.Provider>
