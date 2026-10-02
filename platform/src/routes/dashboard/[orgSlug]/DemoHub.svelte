<script lang="ts">
	import { resolve } from '$app/paths';
	import { getCurrentSeason } from '$lib/api/season.remote';
	import type { Organization } from '$lib/server/db/auth-schema';
	import UserIcon from '@lucide/svelte/icons/user';
	import HouseIcon from '@lucide/svelte/icons/house';
	import TrophyIcon from '@lucide/svelte/icons/trophy';

	let { org }: { org: Organization } = $props();

	const currentSeason = $derived(await getCurrentSeason({ organizationId: org.id }));
	const familyHref = $derived(resolve('/dashboard/[orgSlug]/family', { orgSlug: org.slug }));
	const coachHref = $derived(resolve('/dashboard/[orgSlug]/portal', { orgSlug: org.slug }));
	const statsHref = $derived(
		currentSeason
			? resolve('/dashboard/[orgSlug]/seasons/[seasonSlug]/stats', {
					orgSlug: org.slug,
					seasonSlug: currentSeason.slug,
				})
			: null
	);
</script>

<div class="m-6 space-y-6 text-[#E6EDF3]">
	<header>
		<p class="text-xs font-semibold tracking-wide text-[#58A6FF] uppercase">Demo</p>
		<h1 class="mt-1 text-2xl font-bold">{org.name}</h1>
		<p class="mt-1 max-w-2xl text-sm text-[#8B949E]">
			View-only preview. Player dashboards, coach dashboards, and stats are all on this link.
		</p>
	</header>

	<div class="grid gap-4 sm:grid-cols-3">
		<a
			href={familyHref}
			class="flex flex-col rounded-2xl border border-[#2A3038] bg-[#161B22] p-5 transition-colors hover:border-[#58A6FF]"
		>
			<UserIcon class="size-6 text-[#58A6FF]" />
			<h2 class="mt-3 text-lg font-semibold">Player dashboards</h2>
			<p class="mt-1 text-sm text-[#8B949E]">
				Open any player page — stats, schedule, and development.
			</p>
		</a>
		<a
			href={coachHref}
			class="flex flex-col rounded-2xl border border-[#2A3038] bg-[#161B22] p-5 transition-colors hover:border-[#58A6FF]"
		>
			<HouseIcon class="size-6 text-[#58A6FF]" />
			<h2 class="mt-3 text-lg font-semibold">Coach dashboards</h2>
			<p class="mt-1 text-sm text-[#8B949E]">
				Open any team portal — roster, games, and team stats.
			</p>
		</a>
		{#if statsHref}
			<a
				href={statsHref}
				class="flex flex-col rounded-2xl border border-[#2A3038] bg-[#161B22] p-5 transition-colors hover:border-[#58A6FF]"
			>
				<TrophyIcon class="size-6 text-[#58A6FF]" />
				<h2 class="mt-3 text-lg font-semibold">Season stats</h2>
				<p class="mt-1 text-sm text-[#8B949E]">Player stats, team standings, and the schedule.</p>
			</a>
		{:else}
			<div class="flex flex-col rounded-2xl border border-[#2A3038] bg-[#161B22] p-5 opacity-60">
				<TrophyIcon class="size-6 text-[#58A6FF]" />
				<h2 class="mt-3 text-lg font-semibold">Season stats</h2>
				<p class="mt-1 text-sm text-[#8B949E]">Set an active season to open stats.</p>
			</div>
		{/if}
	</div>
</div>
