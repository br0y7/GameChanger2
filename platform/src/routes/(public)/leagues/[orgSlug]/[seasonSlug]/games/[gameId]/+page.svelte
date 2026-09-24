<script lang="ts">
	import { resolve } from '$app/paths';
	import { PUBLIC_APP_NAME } from '$env/static/public';
	import { getPublicGameBoxScore } from '$lib/api/public-stats.remote';
	import GameRatingDetail, {
		type GameRatingDetailModel,
	} from '$lib/components/GameRatingDetail.svelte';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();

	const box = $derived(
		await getPublicGameBoxScore({
			orgSlug: params.orgSlug,
			seasonSlug: params.seasonSlug,
			gameId: params.gameId,
		})
	);

	const backHref = $derived(
		resolve('/(public)/leagues/[orgSlug]/[seasonSlug]', {
			orgSlug: params.orgSlug,
			seasonSlug: params.seasonSlug,
		})
	);

	let ratingOpen = $state(false);
	let ratingDetail = $state<GameRatingDetailModel | null>(null);

	function openRating(
		player: (typeof box.homeTeam.players)[number],
		opponentName: string
	) {
		if (player.gameRating == null || !player.ratingMeaning) return;
		ratingDetail = {
			playerName: player.name,
			opponentName,
			rating: player.gameRating,
			meaning: player.ratingMeaning,
			points: player.pts,
			rebounds: player.reb,
			offensiveRebounds: player.oreb,
			assists: player.ast,
			steals: player.stl,
			blocks: player.blk,
			turnovers: player.tov,
			breakdown: null,
		};
		ratingOpen = true;
	}
</script>

<svelte:head>
	<title>{box.awayTeam.name} vs {box.homeTeam.name} | {PUBLIC_APP_NAME}</title>
</svelte:head>

<div class="mx-auto max-w-6xl px-4 py-12 sm:px-6" style="font-family: Figtree, system-ui, sans-serif">
	<a href={backHref} class="text-xs font-semibold text-[#B8E05C] hover:underline">← Season</a>
	<p class="mt-4 text-xs font-semibold tracking-[0.18em] text-[#8FA398] uppercase">Final</p>
	<h1
		class="mt-2 text-4xl font-bold tracking-tight text-[#E8F0EA]"
		style="font-family: 'Barlow Condensed', system-ui, sans-serif"
	>
		{box.awayTeam.name}
		<span class="tabular-nums text-[#B8E05C]">{box.awayTeam.score}</span>
		—
		<span class="tabular-nums text-[#B8E05C]">{box.homeTeam.score}</span>
		{box.homeTeam.name}
	</h1>

	{#if box.statsAvailable === false}
		<p class="mt-8 text-sm text-[#8FA398]">Result only. No player box score for this game.</p>
	{:else}
		{#each [box.awayTeam, box.homeTeam] as side (side.id)}
			<section class="mt-8">
				<h2 class="text-sm font-semibold tracking-wide text-[#8FA398] uppercase">{side.name}</h2>
				<div class="mt-3 overflow-x-auto">
					<table class="w-full min-w-[36rem] text-left text-sm text-[#E8F0EA]">
						<thead class="text-xs text-[#8FA398] uppercase">
							<tr>
								<th class="pb-2 font-medium">#</th>
								<th class="pb-2 font-medium">Player</th>
								<th class="pb-2 text-center font-medium">PTS</th>
								<th class="pb-2 text-center font-medium">REB</th>
								<th class="pb-2 text-center font-medium">AST</th>
								<th class="pb-2 text-center font-medium">STL</th>
								<th class="pb-2 text-center font-medium">BLK</th>
								<th class="pb-2 text-center font-medium">Rating</th>
							</tr>
						</thead>
						<tbody>
							{#each side.players as player (player.playerId)}
								<tr class="border-t border-white/10">
									<td class="py-2 tabular-nums text-[#8FA398]">{player.jerseyNumber}</td>
									<td class="py-2">{player.name}</td>
									<td class="py-2 text-center tabular-nums">{player.pts}</td>
									<td class="py-2 text-center tabular-nums">{player.reb}</td>
									<td class="py-2 text-center tabular-nums">{player.ast}</td>
									<td class="py-2 text-center tabular-nums">{player.stl}</td>
									<td class="py-2 text-center tabular-nums">{player.blk}</td>
									<td class="py-2 text-center tabular-nums">
										{#if player.gameRating != null}
											<button
												type="button"
												class="font-semibold text-[#B8E05C] hover:underline"
												onclick={() =>
													openRating(
														player,
														side.id === box.homeTeam.id ? box.awayTeam.name : box.homeTeam.name
													)}
											>
												{player.gameRating.toFixed(1)}
											</button>
										{:else}
											<span class="text-[#8FA398]">—</span>
										{/if}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</section>
		{/each}
	{/if}
</div>

<GameRatingDetail bind:open={ratingOpen} detail={ratingDetail} mode="public" />
