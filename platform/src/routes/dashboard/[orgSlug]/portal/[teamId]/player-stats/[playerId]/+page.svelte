<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { getCoachPlayerDetail } from '$lib/api/coach-player-stats.remote';
	import { getPortalTeamContext } from '$lib/api/coach-portal.remote';
	import BackLink from '$lib/components/BackLink.svelte';
	import GameRatingDetail, {
		type GameRatingDetailModel,
	} from '$lib/components/GameRatingDetail.svelte';
	import ClipboardIcon from '@lucide/svelte/icons/clipboard';
	import CheckIcon from '@lucide/svelte/icons/check';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();

	const context = $derived(await getPortalTeamContext({ teamId: params.teamId }));
	const season = $derived(context?.season);
	const detail = $derived(
		await getCoachPlayerDetail({ teamId: params.teamId, playerId: params.playerId })
	);

	let copied = $state(false);
	let ratingOpen = $state(false);
	let ratingDetail = $state<GameRatingDetailModel | null>(null);

	function openRating(game: (typeof detail.gameLog)[number]) {
		if (game.gameRating == null || !game.meaning) return;
		ratingDetail = {
			playerName: detail.player.name,
			opponentName: game.opponentName,
			rating: game.gameRating,
			meaning: game.meaning,
			points: game.pts,
			rebounds: game.reb,
			offensiveRebounds: game.oreb,
			assists: game.ast,
			steals: game.stl,
			blocks: game.blk,
			turnovers: game.tov,
			breakdown: game.breakdown,
		};
		ratingOpen = true;
	}

	const backHref = $derived(
		resolve('/dashboard/[orgSlug]/portal/[teamId]/player-stats', {
			orgSlug: params.orgSlug,
			teamId: params.teamId,
		})
	);

	const statsHref = $derived(
		detail.statsLink
			? resolve(
					'/dashboard/[orgSlug]/seasons/[seasonSlug]/[divisionSlug]/[teamSlug]/[jerseyNumber]',
					{
						orgSlug: detail.statsLink.orgSlug,
						seasonSlug: detail.statsLink.seasonSlug,
						divisionSlug: detail.statsLink.divisionSlug,
						teamSlug: detail.statsLink.teamSlug,
						jerseyNumber: String(detail.statsLink.jerseyNumber),
					}
				)
			: null
	);

	async function copyStatsLink() {
		if (!statsHref) return;
		await navigator.clipboard.writeText(new URL(statsHref, page.url.origin).toString());
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}

	function fmt(n: number, digits = 1) {
		return n.toFixed(digits);
	}

	function formatDate(d: Date | null) {
		if (!d) return 'TBD';
		return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	}

	function formatUpdated(d: Date | null) {
		if (!d) return null;
		return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	}

	function trendLabel(trend: 'up' | 'down' | 'flat') {
		if (trend === 'up') return '↑';
		if (trend === 'down') return '↓';
		return '→';
	}

	function trendClass(trend: 'up' | 'down' | 'flat') {
		if (trend === 'up') return 'text-[#3FB950]';
		if (trend === 'down') return 'text-[#F85149]';
		return 'text-[#8B949E]';
	}

	function rankLabel(rank: number | null, teamSize: number) {
		if (!rank) return '—';
		return `#${rank} on Team`;
	}
</script>

<section class="space-y-6">
	<BackLink fallbackHref={backHref} fallbackLabel="Player Stats" class="text-[#58A6FF] hover:underline" />

	<header class="flex flex-wrap items-start justify-between gap-3">
		<div>
			<h2 class="text-2xl font-bold tracking-tight uppercase">{detail.player.name}</h2>
			<p class="mt-1 text-sm text-[#8B949E]">
				#{detail.player.jerseyNumber} · {detail.player.teamName}
				{#if season}
					· {season.name}
				{/if}
			</p>
		</div>
		{#if statsHref}
			<button
				type="button"
				class="inline-flex items-center gap-1.5 rounded-md border border-[#2A3038] bg-[#161B22] px-3 py-2 text-sm font-medium text-[#E6EDF3] hover:border-[#58A6FF] hover:text-[#58A6FF]"
				onclick={copyStatsLink}
			>
				{#if copied}
					<CheckIcon class="size-4" /> Copied
				{:else}
					<ClipboardIcon class="size-4" /> Copy stats link
				{/if}
			</button>
		{/if}
	</header>

	<div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
		<div class="rounded-xl border border-[#2A3038] bg-[#161B22] p-4">
			<p class="text-xs font-medium tracking-wide text-[#8B949E] uppercase">Games Played</p>
			<p class="mt-2 text-2xl font-bold tabular-nums">{detail.summary.gp}</p>
		</div>
		<div class="rounded-xl border border-[#2A3038] bg-[#161B22] p-4">
			<p class="text-xs font-medium tracking-wide text-[#8B949E] uppercase">PPG</p>
			<p class="mt-2 text-2xl font-bold tabular-nums">{fmt(detail.summary.ppg)}</p>
		</div>
		<div class="rounded-xl border border-[#2A3038] bg-[#161B22] p-4">
			<p class="text-xs font-medium tracking-wide text-[#8B949E] uppercase">RPG</p>
			<p class="mt-2 text-2xl font-bold tabular-nums">{fmt(detail.summary.rpg)}</p>
		</div>
		<div class="rounded-xl border border-[#2A3038] bg-[#161B22] p-4">
			<p class="text-xs font-medium tracking-wide text-[#8B949E] uppercase">APG</p>
			<p class="mt-2 text-2xl font-bold tabular-nums">{fmt(detail.summary.apg)}</p>
		</div>
		<div class="rounded-xl border border-[#2A3038] bg-[#161B22] p-4">
			<p class="text-xs font-medium tracking-wide text-[#8B949E] uppercase">Average Game Rating</p>
			<p class="mt-2 text-2xl font-bold tabular-nums">
				{detail.summary.averageGameRating == null ? '—' : fmt(detail.summary.averageGameRating)}
			</p>
		</div>
	</div>

	<div class="grid gap-4 lg:grid-cols-2">
		<section class="rounded-2xl border border-[#2A3038] bg-[#161B22] p-5">
			<h3 class="text-sm font-semibold tracking-wide text-[#8B949E] uppercase">Season Stats</h3>
			<div class="mt-4 grid grid-cols-4 gap-2 text-center">
				{#each [
					{ label: 'REB', value: detail.summary.reb },
					{ label: 'AST', value: detail.summary.ast },
					{ label: 'STL', value: detail.summary.stl },
					{ label: 'BLK', value: detail.summary.blk },
				] as item (item.label)}
					<div>
						<p class="text-xs text-[#8B949E]">{item.label}</p>
						<p class="mt-1 text-lg font-bold tabular-nums">{item.value}</p>
					</div>
				{/each}
			</div>
		</section>

		<section class="rounded-2xl border border-[#2A3038] bg-[#161B22] p-5">
			<h3 class="text-sm font-semibold tracking-wide text-[#8B949E] uppercase">Team Rank</h3>
			<ul class="mt-4 space-y-3 text-sm">
				<li class="flex items-center justify-between">
					<span class="text-[#8B949E]">Scoring</span>
					<span class="font-medium">{rankLabel(detail.ranks.scoring, detail.ranks.teamSize)}</span>
				</li>
				<li class="flex items-center justify-between">
					<span class="text-[#8B949E]">Rebounding</span>
					<span class="font-medium"
						>{rankLabel(detail.ranks.rebounding, detail.ranks.teamSize)}</span
					>
				</li>
				<li class="flex items-center justify-between">
					<span class="text-[#8B949E]">Assists</span>
					<span class="font-medium">{rankLabel(detail.ranks.assists, detail.ranks.teamSize)}</span>
				</li>
			</ul>
		</section>
	</div>

	{#if detail.recentForm.games > 0}
		<section class="rounded-2xl border border-[#2A3038] bg-[#161B22] p-5">
			<h3 class="text-sm font-semibold tracking-wide text-[#8B949E] uppercase">
				Last {detail.recentForm.games} Games
			</h3>
			<div class="mt-4 grid grid-cols-3 gap-3">
				<div>
					<p class="text-lg font-bold tabular-nums">
						{fmt(detail.recentForm.ppg)} PPG
						<span class={trendClass(detail.recentForm.ppgTrend)}
							>{trendLabel(detail.recentForm.ppgTrend)}</span
						>
					</p>
					<p class="text-xs text-[#8B949E]">Season {fmt(detail.summary.ppg)}</p>
				</div>
				<div>
					<p class="text-lg font-bold tabular-nums">
						{fmt(detail.recentForm.rpg)} RPG
						<span class={trendClass(detail.recentForm.rpgTrend)}
							>{trendLabel(detail.recentForm.rpgTrend)}</span
						>
					</p>
					<p class="text-xs text-[#8B949E]">Season {fmt(detail.summary.rpg)}</p>
				</div>
				<div>
					<p class="text-lg font-bold tabular-nums">
						{fmt(detail.recentForm.apg)} APG
						<span class={trendClass(detail.recentForm.apgTrend)}
							>{trendLabel(detail.recentForm.apgTrend)}</span
						>
					</p>
					<p class="text-xs text-[#8B949E]">Season {fmt(detail.summary.apg)}</p>
				</div>
			</div>
			{#if detail.recentForm.recentScoring.length}
				<p class="mt-4 text-xs font-medium tracking-wide text-[#8B949E] uppercase">
					Recent scoring
				</p>
				<p class="mt-2 flex flex-wrap gap-3 text-sm tabular-nums text-[#E6EDF3]">
					{#each detail.recentForm.recentScoring as pts, i (i)}
						<span>{pts}</span>
					{/each}
				</p>
			{/if}
		</section>
	{/if}

	<section class="rounded-2xl border border-[#2A3038] bg-[#161B22] p-5">
		<h3 class="text-sm font-semibold tracking-wide text-[#8B949E] uppercase">Game-by-Game</h3>
		{#if detail.gameLog.length === 0}
			<p class="mt-3 text-sm text-[#8B949E]">No games logged yet.</p>
		{:else}
			<div class="mt-4 overflow-x-auto">
				<table class="w-full min-w-[560px] text-left text-sm">
					<thead class="border-b border-[#2A3038] text-xs text-[#8B949E] uppercase">
						<tr>
							<th class="pb-2 font-medium">Date</th>
							<th class="pb-2 font-medium">Opponent</th>
							<th class="pb-2 font-medium">Result</th>
							<th class="pb-2 font-medium tabular-nums">PTS</th>
							<th class="pb-2 font-medium tabular-nums">REB</th>
							<th class="pb-2 font-medium tabular-nums">AST</th>
							<th class="pb-2 font-medium tabular-nums">Rating</th>
						</tr>
					</thead>
					<tbody>
						{#each detail.gameLog as game (game.gameId)}
							<tr class="border-b border-[#2A3038]/50">
								<td class="py-2.5 text-[#8B949E]">{formatDate(game.date)}</td>
								<td class="py-2.5">{game.opponentName}</td>
								<td class="py-2.5">
									{#if game.result}
										<span
											class={game.result === 'W'
												? 'text-[#3FB950]'
												: game.result === 'L'
													? 'text-[#F85149]'
													: 'text-[#8B949E]'}
										>
											{game.result}
											{game.teamScore}–{game.oppScore}
										</span>
									{:else}
										<span class="text-[#8B949E]">—</span>
									{/if}
								</td>
								<td class="py-2.5 tabular-nums">{game.pts}</td>
								<td class="py-2.5 tabular-nums">{game.reb}</td>
								<td class="py-2.5 tabular-nums">{game.ast}</td>
								<td class="py-2.5 tabular-nums">
									{#if game.gameRating != null}
										<button
											type="button"
											class="font-semibold text-[#58A6FF] hover:underline"
											onclick={() => openRating(game)}
										>
											{game.gameRating.toFixed(1)}
										</button>
									{:else}
										<span class="text-[#8B949E]">—</span>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</section>

	<p class="text-xs text-[#8B949E]">
		Stats are managed by the league organizer.
		{#if formatUpdated(detail.lastUpdated)}
			Last updated: {formatUpdated(detail.lastUpdated)}
		{/if}
	</p>
</section>

<GameRatingDetail bind:open={ratingOpen} detail={ratingDetail} mode="development" askAs="player" />
