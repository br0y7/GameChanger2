<script lang="ts">
	import type { PageProps } from './$types';
	import { getOrganization } from '$lib/api/organization.remote';
	import { getSeason } from '$lib/api/season.remote';
	import { getGameBoxScore } from '$lib/api/game.remote';
	import { PUBLIC_APP_NAME } from '$env/static/public';
	import { resolve } from '$app/paths';
	import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left';
	import { teamColorFromId, teamInitials } from '$lib/utils/team-identity';
	import { askAiPanel } from '$lib/ai/ask-ai-state.svelte';

	let { params }: PageProps = $props();

	const org = $derived(await getOrganization({ slug: params.orgSlug }));
	const season = $derived(await getSeason({ slug: params.seasonSlug, organizationId: org.id }));
	const box = $derived(await getGameBoxScore({ gameId: params.gameId }));

	const formatDate = (date: Date | null | undefined) => {
		if (!date) return null;
		return new Date(date).toLocaleDateString('en-US', {
			weekday: 'short',
			month: 'short',
			day: 'numeric',
			year: 'numeric',
		});
	};

	const backHref = $derived(
		resolve('/dashboard/[orgSlug]/seasons/[seasonSlug]', {
			orgSlug: params.orgSlug,
			seasonSlug: params.seasonSlug,
		})
	);

	const dateLabel = $derived(formatDate(box.completedAt ?? box.scheduledAt));
</script>

<svelte:head>
	<title>
		{box.awayTeam.name} vs {box.homeTeam.name} | {PUBLIC_APP_NAME}
	</title>
</svelte:head>

<div class="min-h-full bg-[#0D1117] text-[#E6EDF3]">
	<div class="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 sm:py-6">
		<a
			href={backHref}
			class="mb-4 inline-flex items-center gap-1 text-sm text-[#8B949E] transition-colors hover:text-[#58A6FF]"
		>
			<ChevronLeftIcon class="size-4" />
			{season.name}
		</a>

		<header class="mb-6 rounded-2xl border border-[#2A3038] bg-[#161B22] p-5 sm:p-6">
			<div class="mb-4 flex flex-wrap items-center justify-between gap-2">
				<p class="text-xs font-semibold tracking-wide text-[#8B949E] uppercase">Box Score</p>
				<button
					type="button"
					class="text-sm font-medium text-[#58A6FF] hover:underline"
					onclick={() =>
						askAiPanel.openPanel(
							`Summarize ${box.awayTeam.name} vs ${box.homeTeam.name}`
						)
					}
				>
					✦ Analyze this game
				</button>
			</div>
			<div class="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
				<div class="flex min-w-0 flex-1 items-center gap-3">
					<div
						class="flex size-12 shrink-0 items-center justify-center rounded-full text-sm font-black text-white"
						style="background-color: {teamColorFromId(box.awayTeam.id)}"
					>
						{teamInitials(box.awayTeam.name)}
					</div>
					<div class="min-w-0">
						<p class="truncate text-lg font-bold">{box.awayTeam.name}</p>
						<p class="text-sm text-[#8B949E]">Away</p>
					</div>
				</div>

				<div class="text-center">
					<p class="text-3xl font-extrabold tracking-tight tabular-nums sm:text-4xl">
						{box.awayTeam.score}
						<span class="mx-1 text-[#8B949E]">–</span>
						{box.homeTeam.score}
					</p>
					{#if dateLabel}
						<p class="mt-1 text-sm text-[#8B949E]">{dateLabel}</p>
					{/if}
				</div>

				<div class="flex min-w-0 flex-1 items-center justify-end gap-3">
					<div class="min-w-0 text-end">
						<p class="truncate text-lg font-bold">{box.homeTeam.name}</p>
						<p class="text-sm text-[#8B949E]">Home</p>
					</div>
					<div
						class="flex size-12 shrink-0 items-center justify-center rounded-full text-sm font-black text-white"
						style="background-color: {teamColorFromId(box.homeTeam.id)}"
					>
						{teamInitials(box.homeTeam.name)}
					</div>
				</div>
			</div>
		</header>

		{#each [box.awayTeam, box.homeTeam] as side (side.id)}
			<section class="mb-5 rounded-2xl border border-[#2A3038] bg-[#161B22] p-5 sm:p-6">
				<div class="mb-4 flex items-baseline justify-between gap-3">
					<h2 class="text-sm font-semibold tracking-wide text-[#8B949E] uppercase">{side.name}</h2>
					<p class="text-xl font-bold tabular-nums">{side.score}</p>
				</div>

				{#if side.players.length === 0}
					<p class="text-sm text-[#8B949E]">No player stats recorded for this team.</p>
				{:else}
					<div class="overflow-x-auto">
						<table class="w-full min-w-[40rem] text-sm">
							<thead>
								<tr class="border-b border-[#2A3038] text-[#8B949E]">
									<th class="w-10 py-2 text-left font-medium">#</th>
									<th class="py-2 text-left font-medium">Player</th>
									<th class="py-2 text-center font-medium">PTS</th>
									<th class="py-2 text-center font-medium">REB</th>
									<th class="py-2 text-center font-medium">AST</th>
									<th class="py-2 text-center font-medium">FG</th>
									<th class="py-2 text-center font-medium">3P</th>
									<th class="py-2 text-center font-medium">FT</th>
									<th class="py-2 text-center font-medium">STL</th>
									<th class="py-2 text-center font-medium">BLK</th>
									<th class="py-2 text-center font-medium">TO</th>
								</tr>
							</thead>
							<tbody>
								{#each side.players as player (player.playerId)}
									<tr class="border-b border-[#2A3038]/last:border-0">
										<td class="py-2.5 tabular-nums text-[#8B949E]">{player.jerseyNumber}</td>
										<td class="py-2.5 font-medium">{player.name}</td>
										<td class="py-2.5 text-center font-semibold tabular-nums">{player.pts}</td>
										<td class="py-2.5 text-center tabular-nums">{player.reb}</td>
										<td class="py-2.5 text-center tabular-nums">{player.ast}</td>
										<td class="py-2.5 text-center tabular-nums">{player.fgm}-{player.fga}</td>
										<td class="py-2.5 text-center tabular-nums">{player.fg3m}-{player.fg3a}</td>
										<td class="py-2.5 text-center tabular-nums">{player.ftm}-{player.fta}</td>
										<td class="py-2.5 text-center tabular-nums">{player.stl}</td>
										<td class="py-2.5 text-center tabular-nums">{player.blk}</td>
										<td class="py-2.5 text-center tabular-nums">{player.tov}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			</section>
		{/each}
	</div>
</div>
