<script lang="ts">
	import { resolve } from '$app/paths';
	import { getOrganization } from '$lib/api/organization.remote';
	import { getCurrentSeason } from '$lib/api/season.remote';
	import Button from '$lib/components/ui/button/button.svelte';

	const org = await getOrganization();
	const currentSeason = await getCurrentSeason({ organizationId: org.id });
</script>

<div class="flex flex-col m-6 gap-6">
	<h1 class="text-2xl font-bold">{org.name} Overview</h1>

	<section class="flex gap-4">
		{#if currentSeason}
			<h2 class="text-xl">Current Season: {currentSeason.name}</h2>
			<Button href={resolve('/dashboard/seasons/[slug].svelte', { slug: currentSeason.slug })}>
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
