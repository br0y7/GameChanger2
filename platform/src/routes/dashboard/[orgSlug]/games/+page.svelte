<script lang="ts">
	import { PUBLIC_APP_NAME } from '$env/static/public';
	import { resolve } from '$app/paths';
	import { getOrganization } from '$lib/api/organization.remote';
	import { getCurrentSeason } from '$lib/api/season.remote';
	import { getSeasonGames } from '$lib/api/league-manage.remote';
	import ActiveSeasonGate from '../ActiveSeasonGate.svelte';
	import type { PageProps } from './$types';
	import { redirect } from '@sveltejs/kit';

	let { params }: PageProps = $props();
	const org = $derived(await getOrganization({ slug: params.orgSlug }));

	const validateOrg = () => {
		if (org.type !== 'league') {
			redirect(303, resolve('/dashboard/[orgSlug]', { orgSlug: org.slug }));
		}
	};
	validateOrg();

	const currentSeason = $derived(await getCurrentSeason({ organizationId: org.id }));
	const games = $derived(
		currentSeason ? await getSeasonGames({ seasonId: currentSeason.id }) : []
	);

	const formatDate = (date: Date | null | undefined) => {
		if (!date) return 'TBD';
		return new Date(date).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
		});
	};

	const gameTypeLabel = (type: string | null | undefined) => {
		if (type === 'playoff') return 'Playoff';
		if (type === 'finals') return 'Finals';
		return 'Regular Season';
	};

	function boxHref(gameId: string) {
		if (!currentSeason) return '#';
		return resolve('/dashboard/[orgSlug]/seasons/[seasonSlug]/games/[gameId]', {
			orgSlug: params.orgSlug,
			seasonSlug: currentSeason.slug,
			gameId,
		});
	}
</script>

<svelte:head>
	<title>Games | {org.name} | {PUBLIC_APP_NAME}</title>
</svelte:head>

<div class="min-h-full bg-[#0D1117] text-[#E6EDF3]">
	<div class="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-6">
		<header class="flex flex-wrap items-end justify-between gap-3">
			<div>
				<p class="text-xs font-semibold tracking-wide text-[#8B949E] uppercase">Manage</p>
				<h1 class="mt-1 text-2xl font-bold tracking-tight">Games</h1>
				{#if currentSeason}
					<p class="mt-1 text-sm text-[#8B949E]">
						{games.length} games in {currentSeason.name}
					</p>
				{/if}
			</div>
			<a
				href={resolve('/dashboard/[orgSlug]/import', { orgSlug: params.orgSlug })}
				class="inline-flex rounded-md border border-[#2A3038] bg-[#161B22] px-3 py-2 text-sm font-medium text-[#E6EDF3] hover:border-[#58A6FF]"
			>
				Import / add games
			</a>
		</header>

		{#if !currentSeason}
			<ActiveSeasonGate organizationId={org.id} orgSlug={params.orgSlug} />
		{:else if games.length === 0}
			<div class="rounded-2xl border border-[#2A3038] bg-[#161B22] p-6 text-center">
				<p class="text-sm text-[#8B949E]">No games in this season yet.</p>
				<a
					href={resolve('/dashboard/[orgSlug]/import', { orgSlug: params.orgSlug })}
					class="mt-4 inline-flex rounded-md bg-[#58A6FF] px-3 py-2 text-sm font-semibold text-[#0D1117]"
				>
					Import spreadsheet
				</a>
			</div>
		{:else}
			<ul class="divide-y divide-[#2A3038] overflow-hidden rounded-2xl border border-[#2A3038] bg-[#161B22]">
				{#each games as game (game.id)}
					<li>
						<a
							href={boxHref(game.id)}
							class="flex flex-col gap-1 px-4 py-3 transition-colors hover:bg-[#1C2128] sm:flex-row sm:items-center sm:justify-between"
						>
							<div class="min-w-0">
								<p class="font-medium">
									{game.awayTeam.name}
									<span class="text-[#8B949E]">@</span>
									{game.homeTeam.name}
								</p>
								<p class="text-xs text-[#8B949E]">
									{formatDate(game.completedAt ?? game.scheduledAt)}
									· {gameTypeLabel(game.gameType)}
									{#if game.statsAvailable === false}
										· Result only
									{/if}
								</p>
							</div>
							<p class="shrink-0 font-semibold tabular-nums text-[#E6EDF3]">
								{game.awayTeamScore}–{game.homeTeamScore}
							</p>
						</a>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</div>
