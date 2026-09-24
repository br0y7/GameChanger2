<script lang="ts">
	import { resolve } from '$app/paths';
	import { getFamilyPlayerHome } from '$lib/api/family.remote';
	import { formatRankPlace, type RankedStatKey } from '$lib/stats/stat-ranks';
	import GameRatingDetail, {
		type GameRatingDetailModel,
	} from '$lib/components/GameRatingDetail.svelte';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();
	const home = $derived(await getFamilyPlayerHome({ playerId: params.playerId }));

	const base = $derived(
		resolve('/dashboard/[orgSlug]/family/[playerId]', {
			orgSlug: params.orgSlug,
			playerId: params.playerId,
		})
	);

	function fmt(n: number) {
		return n.toFixed(1);
	}

	function fmtPct(n: number) {
		return `${(n * 100).toFixed(1)}%`;
	}

	/** Typical marks so a steal rate can outrank a modest scoring average. */
	const strongestStats = $derived(
		[
			{ label: 'PPG', value: home.season.ppg, baseline: 8 },
			{ label: 'RPG', value: home.season.rpg, baseline: 4 },
			{ label: 'APG', value: home.season.apg, baseline: 2 },
			{ label: 'SPG', value: home.season.spg, baseline: 1 },
			{ label: 'BPG', value: home.season.bpg, baseline: 0.5 },
		]
			.map((stat) => ({ ...stat, score: stat.value / stat.baseline }))
			.sort((a, b) => b.score - a.score)
			.slice(0, 3)
	);

	const strongestShooting = $derived(
		[
			{ label: 'FG%', value: home.season.fgPct, baseline: 0.4 },
			{ label: '3P%', value: home.season.fg3Pct, baseline: 0.3 },
			{ label: 'FT%', value: home.season.ftPct, baseline: 0.7 },
		]
			.map((stat) => ({ ...stat, score: stat.value / stat.baseline }))
			.sort((a, b) => b.score - a.score)
			.slice(0, 2)
	);

	function progressLabel(pct: number | null) {
		if (pct == null) return null;
		const sign = pct > 0 ? '+' : '';
		return `${sign}${pct}%`;
	}

	let ratingOpen = $state(false);
	let ratingDetail = $state<GameRatingDetailModel | null>(null);

	function openRating(game: (typeof home.recentGames)[number]) {
		if (game.gameRating == null || !game.meaning) return;
		ratingDetail = {
			playerName: home.player.name,
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

	const formArrow = $derived(
		home.ratingSummary.trend === 'up' ? '↑' : home.ratingSummary.trend === 'down' ? '↓' : '→'
	);

	function progressClass(pct: number | null) {
		if (pct == null) return 'text-[#8B949E]';
		if (pct > 0) return 'text-[#3FB950]';
		if (pct < 0) return 'text-[#F85149]';
		return 'text-[#8B949E]';
	}
</script>

{#snippet rankMarks(label: string)}
	{@const key = (
		{
			PPG: 'points',
			RPG: 'rebounds',
			APG: 'assists',
			SPG: 'steals',
			BPG: 'blocks',
			'FG%': 'fg',
			'3P%': 'fg3',
			'FT%': 'ft',
		} as Record<string, RankedStatKey>
	)[label]}
	{@const rank = key ? home.ranks[key] : undefined}
	{#if rank && (rank.division != null || rank.league != null)}
		{#if rank.division != null}
			<p class="mt-1 text-[11px] font-semibold leading-tight text-[#58A6FF]">
				Division {formatRankPlace(rank.division)}
			</p>
		{/if}
		{#if rank.league != null}
			<p
				class="text-[11px] font-semibold leading-tight text-[#E3B341] {rank.division == null
					? 'mt-1'
					: ''}"
			>
				League {formatRankPlace(rank.league)}
			</p>
		{/if}
	{/if}
{/snippet}

<section class="space-y-6">
	<div class="text-center">
		<p class="text-xs font-semibold tracking-wide text-[#8B949E] uppercase">My Player</p>
		<p class="mt-2 text-sm text-[#8B949E]">
			{home.player.divisionName || 'Division'} – {home.player.leagueName}
		</p>
	</div>

	<section class="rounded-2xl border border-[#2A3038] bg-[#161B22]/80 p-5 text-center">
		<p class="text-xs font-semibold tracking-wide text-[#8B949E] uppercase">
			{home.player.seasonName || 'Season'}
		</p>
		{#if home.ratingSummary.average != null}
			<p class="mt-2 text-4xl font-extrabold tabular-nums tracking-tight">
				{fmt(home.ratingSummary.average)}
			</p>
			<p class="mt-1 text-sm text-[#8B949E]">Average Game Rating</p>
		{:else}
			<p class="mt-2 text-sm text-[#8B949E]">Average Game Rating appears after games are rated.</p>
		{/if}
		<p class="mt-3 text-sm tabular-nums text-[#E6EDF3]">
			{fmt(home.season.ppg)} PPG
			<span class="text-[#8B949E]"> | </span>
			{fmt(home.season.rpg)} RPG
			<span class="text-[#8B949E]"> | </span>
			{fmt(home.season.apg)} APG
		</p>
		{#if home.ratingSummary.lastFive.length > 0}
			<p class="mt-3 text-sm text-[#8B949E]">
				Recent form:
				<span class="tabular-nums text-[#E6EDF3]">
					{home.ratingSummary.lastFive.map((rating) => rating.toFixed(1)).join(' → ')}
				</span>
				<span class="ml-1">{formArrow}</span>
			</p>
			{#if home.ratingSummary.lastFiveAverage != null}
				<p class="mt-1 text-xs text-[#8B949E]">
					Last 5 average: {fmt(home.ratingSummary.lastFiveAverage)}
				</p>
			{/if}
		{/if}
	</section>

	<section>
		<p class="mb-3 text-center text-xs font-semibold tracking-wide text-[#8B949E] uppercase">
			Strongest Stats
		</p>
		<div class="grid grid-cols-3 gap-3">
			{#each strongestStats as stat (stat.label)}
				<div
					class="rounded-2xl border border-[#2A3038] bg-[#161B22]/80 px-3 py-5 text-center backdrop-blur"
				>
					<p class="text-3xl font-extrabold tabular-nums tracking-tight text-[#E6EDF3]">
						{fmt(stat.value)}
					</p>
					<p class="mt-1 text-xs font-semibold tracking-wide text-[#8B949E] uppercase">
						{stat.label}
					</p>
					{@render rankMarks(stat.label)}
				</div>
			{/each}
		</div>
		<p class="mt-5 mb-3 text-center text-xs font-semibold tracking-wide text-[#8B949E] uppercase">
			Shooting
		</p>
		<div class="grid grid-cols-2 gap-3">
			{#each strongestShooting as stat (stat.label)}
				<div
					class="rounded-2xl border border-[#2A3038] bg-[#161B22]/80 px-3 py-5 text-center backdrop-blur"
				>
					<p class="text-3xl font-extrabold tabular-nums tracking-tight text-[#E6EDF3]">
						{fmtPct(stat.value)}
					</p>
					<p class="mt-1 text-xs font-semibold tracking-wide text-[#8B949E] uppercase">
						{stat.label}
					</p>
					{@render rankMarks(stat.label)}
				</div>
			{/each}
		</div>
		<p class="mt-2 text-center text-xs text-[#8B949E]">
			{home.season.gp} games played ·
			<a href={`${base}/stats`} class="text-[#58A6FF] hover:underline">All averages</a>
		</p>
	</section>

	{#if home.season.gp >= 2}
		<section class="rounded-2xl border border-[#2A3038] bg-[#161B22]/80 p-5">
			<p class="text-xs font-semibold tracking-wide text-[#8B949E] uppercase">Season Progress</p>
			<p class="mt-1 text-sm text-[#8B949E]">Early season vs recent form</p>
			<ul class="mt-4 space-y-4">
				{#each [
					{ label: 'Points per game', ...home.progress.points },
					{ label: 'Rebounds per game', ...home.progress.rebounds },
					{ label: 'Assists per game', ...home.progress.assists },
				] as row (row.label)}
					<li>
						<p class="text-sm font-medium">{row.label}</p>
						<p class="mt-1 text-sm text-[#8B949E]">
							Season beginning: <span class="tabular-nums text-[#E6EDF3]">{fmt(row.beginning)}</span>
							· Current:
							<span class="tabular-nums text-[#E6EDF3]">{fmt(row.current)}</span>
							{#if progressLabel(row.improvementPct)}
								<span class="ml-1 font-semibold {progressClass(row.improvementPct)}">
									{progressLabel(row.improvementPct)} improvement
								</span>
							{/if}
						</p>
					</li>
				{/each}
			</ul>
		</section>
	{/if}

	<section class="rounded-2xl border border-[#2A3038] bg-[#161B22]/80 p-5">
		<div class="flex items-center justify-between gap-2">
			<p class="text-xs font-semibold tracking-wide text-[#8B949E] uppercase">Recent Games</p>
			<a href={`${base}/stats`} class="text-xs text-[#58A6FF] hover:underline">All stats →</a>
		</div>
		{#if home.recentGames.length === 0}
			<p class="mt-3 text-sm text-[#8B949E]">No games recorded yet.</p>
		{:else}
			<div class="mt-3 overflow-x-auto">
				<table class="w-full text-left text-sm">
					<thead class="text-xs text-[#8B949E] uppercase">
						<tr>
							<th class="pb-2 font-medium">Opponent</th>
							<th class="pb-2 font-medium tabular-nums">PTS</th>
							<th class="pb-2 font-medium tabular-nums">REB</th>
							<th class="pb-2 font-medium tabular-nums">AST</th>
							<th class="pb-2 font-medium tabular-nums">Rating</th>
						</tr>
					</thead>
					<tbody>
						{#each home.recentGames as game (game.gameId)}
							<tr class="border-t border-[#2A3038]/60">
								<td class="py-2.5">{game.opponentName}</td>
								<td class="py-2.5 tabular-nums font-medium">{game.pts}</td>
								<td class="py-2.5 tabular-nums">{game.pointsOnly ? '—' : game.reb}</td>
								<td class="py-2.5 tabular-nums">{game.pointsOnly ? '—' : game.ast}</td>
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

	<section class="grid gap-3 sm:grid-cols-2">
		<div class="rounded-2xl border border-[#3FB950]/25 bg-[#161B22]/80 p-5">
			<p class="text-xs font-semibold tracking-wide text-[#3FB950] uppercase">Your Strengths</p>
			{#if home.strengths.length}
				<ul class="mt-3 space-y-1.5 text-sm">
					{#each home.strengths as item (item)}
						<li>{item}</li>
					{/each}
				</ul>
			{:else}
				<p class="mt-3 text-sm text-[#8B949E]">Keep playing — strengths appear with more games.</p>
			{/if}
			<a href={`${base}/development`} class="mt-3 inline-block text-xs text-[#58A6FF] hover:underline"
				>Full development →</a
			>
		</div>
		<div class="rounded-2xl border border-[#F0A020]/25 bg-[#161B22]/80 p-5">
			<p class="text-xs font-semibold tracking-wide text-[#F0A020] uppercase">Focus Areas</p>
			{#if home.focusAreas.length}
				<ul class="mt-3 space-y-1.5 text-sm">
					{#each home.focusAreas as item (item)}
						<li>{item}</li>
					{/each}
				</ul>
			{:else}
				<p class="mt-3 text-sm text-[#8B949E]">No clear focus flags yet.</p>
			{/if}
		</div>
	</section>

	<section class="rounded-2xl border border-[#2A3038] bg-[#161B22]/80 p-5">
		<p class="text-xs font-semibold tracking-wide text-[#8B949E] uppercase">Coach Feedback</p>
		{#if home.coachFeedback}
			<p class="mt-3 text-sm leading-relaxed text-[#E6EDF3]">“{home.coachFeedback}”</p>
		{:else}
			<p class="mt-3 text-sm text-[#8B949E]">
				No coach notes yet. When league staff add one, only your family can see it.
			</p>
		{/if}
	</section>
</section>

<GameRatingDetail bind:open={ratingOpen} detail={ratingDetail} mode="development" />
