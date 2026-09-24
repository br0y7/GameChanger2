<script lang="ts">
	import { getFamilyPlayerHome } from '$lib/api/family.remote';
	import GameRatingDetail, {
		type GameRatingDetailModel,
	} from '$lib/components/GameRatingDetail.svelte';
	import { formatRankPlace, type RankedStatKey } from '$lib/stats/stat-ranks';
	import { trueShootingPercentage } from '$lib/utils/collection';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();
	const home = $derived(await getFamilyPlayerHome({ playerId: params.playerId }));
	let ratingOpen = $state(false);
	let ratingDetail = $state<GameRatingDetailModel | null>(null);

	function openRating(game: (typeof home.gameLog)[number]) {
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

	function fmt(n: number) {
		return n.toFixed(1);
	}

	function fmtPct(n: number) {
		return `${(n * 100).toFixed(1)}%`;
	}

	const trueShootingPct = $derived(
		trueShootingPercentage(home.season.ppg, home.season.fga, home.season.fta)
	);

	const countingAverages = $derived([
		{ label: 'Points', value: home.season.ppg, rank: 'points' as RankedStatKey },
		{ label: 'Rebounds', value: home.season.rpg, rank: 'rebounds' as RankedStatKey },
		{ label: 'Assists', value: home.season.apg, rank: 'assists' as RankedStatKey },
		{ label: 'Steals', value: home.season.spg, rank: 'steals' as RankedStatKey },
		{ label: 'Blocks', value: home.season.bpg, rank: 'blocks' as RankedStatKey },
	]);

	const extraAverages = $derived([
		{ label: 'Offensive Rebounds', value: home.season.orpg, rank: 'oreb' as RankedStatKey },
		{ label: 'Defensive Rebounds', value: home.season.drpg, rank: 'dreb' as RankedStatKey },
		{ label: 'Threes Made per game', value: home.season.fg3m, rank: 'threes' as RankedStatKey },
		{ label: 'FTs Made per game', value: home.season.ftm, rank: 'fts' as RankedStatKey },
		{ label: 'Personal Fouls', value: home.season.pf, rank: null },
	]);

	const shootingAverages = $derived([
		{ label: 'FG%', value: home.season.fgPct, rank: 'fg' as RankedStatKey },
		{ label: '3P%', value: home.season.fg3Pct, rank: 'fg3' as RankedStatKey },
		{ label: 'FT%', value: home.season.ftPct, rank: 'ft' as RankedStatKey },
		{ label: 'True Shooting %', value: trueShootingPct, rank: 'ts' as RankedStatKey },
	]);
</script>

{#snippet rankMarks(key: RankedStatKey)}
	{@const rank = home.ranks[key]}
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
	<div class="rounded-2xl border border-[#2A3038] bg-[#161B22]/80 p-5">
		<p class="text-xs font-semibold tracking-wide text-[#8B949E] uppercase">Season Averages</p>
		<div class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
			{#each countingAverages as stat (stat.label)}
				<div class="rounded-xl border border-[#2A3038] bg-[#0D1117]/50 p-4 text-center">
					<p class="text-2xl font-bold tabular-nums">{fmt(stat.value)}</p>
					<p class="mt-1 text-xs text-[#8B949E]">{stat.label}</p>
					{@render rankMarks(stat.rank)}
				</div>
			{/each}
		</div>
		<p class="mt-6 text-xs font-semibold tracking-wide text-[#8B949E] uppercase">Extra Stats</p>
		<div class="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
			{#each extraAverages as stat (stat.label)}
				<div class="rounded-xl border border-[#2A3038] bg-[#0D1117]/50 p-4 text-center">
					<p class="text-2xl font-bold tabular-nums">{fmt(stat.value)}</p>
					<p class="mt-1 text-xs text-[#8B949E]">{stat.label}</p>
					{#if stat.rank}
						{@render rankMarks(stat.rank)}
					{/if}
				</div>
			{/each}
		</div>
		<p class="mt-6 text-xs font-semibold tracking-wide text-[#8B949E] uppercase">Shooting %</p>
		<div class="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
			{#each shootingAverages as stat (stat.label)}
				<div class="rounded-xl border border-[#2A3038] bg-[#0D1117]/50 p-4 text-center">
					<p class="text-2xl font-bold tabular-nums">{fmtPct(stat.value)}</p>
					<p class="mt-1 text-xs text-[#8B949E]">{stat.label}</p>
					{@render rankMarks(stat.rank)}
				</div>
			{/each}
		</div>
	</div>

	<div class="rounded-2xl border border-[#2A3038] bg-[#161B22]/80 p-5">
		<p class="text-xs font-semibold tracking-wide text-[#8B949E] uppercase">Game Log</p>
		{#if home.gameLog.length === 0}
			<p class="mt-3 text-sm text-[#8B949E]">No game stats yet.</p>
		{:else}
			<div class="mt-3 overflow-x-auto">
				<table class="w-full text-left text-sm">
					<thead class="text-xs text-[#8B949E] uppercase">
						<tr>
							<th class="pb-2 font-medium">Opponent</th>
							<th class="pb-2 font-medium tabular-nums">PTS</th>
							<th class="pb-2 font-medium tabular-nums">REB</th>
							<th class="pb-2 font-medium tabular-nums">AST</th>
							<th class="pb-2 font-medium tabular-nums">STL</th>
							<th class="pb-2 font-medium tabular-nums">Rating</th>
						</tr>
					</thead>
					<tbody>
						{#each home.gameLog as game (game.gameId)}
							<tr class="border-t border-[#2A3038]/60">
								<td class="py-2.5">{game.opponentName}</td>
								<td class="py-2.5 tabular-nums font-medium">{game.pts}</td>
								<td class="py-2.5 tabular-nums">{game.reb}</td>
								<td class="py-2.5 tabular-nums">{game.ast}</td>
								<td class="py-2.5 tabular-nums">{game.stl}</td>
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
	</div>
</section>

<GameRatingDetail bind:open={ratingOpen} detail={ratingDetail} mode="development" />
