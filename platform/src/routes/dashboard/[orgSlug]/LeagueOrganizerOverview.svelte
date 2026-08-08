<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { getCurrentSeason } from '$lib/api/season.remote';
	import Button from '$lib/components/ui/button/button.svelte';
	import type { Organization } from '$lib/server/db/auth-schema';

	let { org }: { org: Organization } = $props();
	const currentSeason = $derived(await getCurrentSeason({ organizationId: org.id }));
</script>

<div class="m-6 flex flex-col gap-6">
	<h1 class="text-2xl font-bold">{org.name} Overview</h1>

	<section class="flex gap-4">
		{#if currentSeason}
			<h2 class="text-xl">Current Season: {currentSeason.name}</h2>
			<Button
				href={resolve('/dashboard/[orgSlug]/seasons/[seasonSlug]', {
					orgSlug: page.params.orgSlug!,
					seasonSlug: currentSeason.slug,
				})}
			>
				Manage
			</Button>
		{:else}
			<h2 class="text-xl">No active current season..</h2>
		{/if}
	</section>

	<!-- List of games, scores -->
	<!-- Number of divisions -->
	<!-- Number of teams -->
	<!-- Number of players -->
</div>
