<script lang="ts">
	import { resolve } from '$app/paths';
	import { PUBLIC_APP_NAME } from '$env/static/public';
	import { getPublicGameBoxScore } from '$lib/api/public-stats.remote';
	import GameRatingDetail, {
		type GameRatingDetailModel,
	} from '$lib/components/GameRatingDetail.svelte';
	import { gameTypeLabel, isRegularSeasonGameType, resultOnlyOutcome } from '$lib/schemas/game';
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

	function formatDate(d: Date | null) {
		if (!d) return null;
		return new Date(d).toLocaleDateString('en-US', {
			weekday: 'short',
			month: 'short',
			day: 'numeric',
			year: 'numeric',
		});
	}

	function openRating(player: (typeof box.homeTeam.players)[number], opponentName: string) {
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
			breakdown: player.ratingBreakdown,
		};
		ratingOpen = true;
	}
</script>

<svelte:head>
	<title>{box.awayTeam.name} vs {box.homeTeam.name} | {PUBLIC_APP_NAME}</title>
</svelte:head>

<div
	class="mx-auto max-w-6xl px-4 py-12 sm:px-6"
	style="font-family: Figtree, system-ui, sans-serif"
>
	<a href={backHref} class="text-xs font-semibold text-[#B8E05C] hover:underline">← Season</a>
	<p class="mt-4 text-xs font-semibold tracking-[0.18em] text-[#8FA398] uppercase">
		{box.statsAvailable === false && !box.pointsOnly ? 'Result' : 'Final'}
		{#if !isRegularSeasonGameType(box.gameType)}
			· {gameTypeLabel(box.gameType)}
		{/if}
	</p>
	<h1
		class="mt-2 text-4xl font-bold tracking-tight text-[#E8F0EA]"
		style="font-family: 'Barlow Condensed', system-ui, sans-serif"
	>
		{box.awayTeam.name}
		{#if box.statsAvailable === false && !box.pointsOnly}
			<span class="text-[#B8E05C]">
				{resultOnlyOutcome(box.defaultLossSide, false, box.awayTeam.score, box.homeTeam.score)}
			</span>
			—
			<span class="text-[#B8E05C]">
				{resultOnlyOutcome(box.defaultLossSide, true, box.homeTeam.score, box.awayTeam.score)}
			</span>
		{:else}
			<span class="text-[#B8E05C] tabular-nums">{box.awayTeam.score}</span>
			—
			<span class="text-[#B8E05C] tabular-nums">{box.homeTeam.score}</span>
		{/if}
		{box.homeTeam.name}
	</h1>
	{#if formatDate(box.completedAt)}
		<p class="mt-2 text-sm text-[#8FA398]">{formatDate(box.completedAt)}</p>
	{/if}
	{#if box.statsAvailable === false && !box.pointsOnly}
		<p class="mt-2 text-sm text-[#8FA398]">
			{box.defaultLossSide === 'home' || box.defaultLossSide === 'away'
				? 'This game was a default. No player box score for this game.'
				: 'Recorded as Win / Lose only. No player box score for this game.'}
		</p>
	{:else if box.pointsOnly}
		<p class="mt-2 text-sm text-[#8FA398]">
			Points only. Other stats were not on the sheet, so there is no game rating.
		</p>
	{/if}

	{#if box.mvp}
		<section class="mt-8 rounded-2xl border border-white/10 bg-white/5 p-5">
			<p class="text-xs font-semibold tracking-[0.18em] text-[#B8E05C] uppercase">
				{box.mvp.kind === 'candidates' ? 'MVP Candidates' : 'Player of the Game'}
			</p>
			<div class={box.mvp.players.length > 1 ? 'mt-3 grid gap-4 sm:grid-cols-2' : 'mt-3'}>
				{#each box.mvp.players as player (player.playerId)}
					<div>
						<p class="text-xl font-bold">
							#{player.jerseyNumber}
							{player.name}
						</p>
						<p class="text-sm text-[#8FA398]">{player.teamName}</p>
						<p class="mt-1 text-sm tabular-nums text-[#E8F0EA]">
							{player.gameRating == null ? '—' : player.gameRating.toFixed(1)} rating · {player.pts} PTS
							· {player.reb} REB · {player.ast} AST
						</p>
					</div>
				{/each}
			</div>
			{#if box.mvp.kind === 'candidates'}
				<p class="mt-3 text-xs text-[#8FA398]">
					These Game Ratings are within 0.3. The stats explain the different impacts.
				</p>
			{/if}
		</section>
	{/if}

	{#if box.statsAvailable !== false || box.pointsOnly}
		{#each [box.awayTeam, box.homeTeam] as side (side.id)}
			<section class="mt-8">
				<h2 class="text-sm font-semibold tracking-wide text-[#8FA398] uppercase">
					<a
						href={resolve(
							`/(public)/leagues/[orgSlug]/[seasonSlug]?tab=players&division=${side.divisionSlug}&team=${side.slug}`,
							{
								orgSlug: params.orgSlug,
								seasonSlug: params.seasonSlug,
							}
						)}
						class="hover:text-[#E8F0EA] hover:underline"
					>
						{side.name}
					</a>
				</h2>
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
									<td class="py-2 text-[#8FA398] tabular-nums">{player.jerseyNumber}</td>
									<td class="py-2">
										<a
											href={resolve('/(public)/leagues/[orgSlug]/[seasonSlug]/players/[playerId]', {
												orgSlug: params.orgSlug,
												seasonSlug: params.seasonSlug,
												playerId: player.playerId,
											})}
											class="hover:text-[#B8E05C] hover:underline"
										>
											{player.name}
										</a>
									</td>
									<td class="py-2 text-center tabular-nums">{player.pts}</td>
									<td class="py-2 text-center tabular-nums"
										>{player.pointsOnly ? '—' : player.reb}</td
									>
									<td class="py-2 text-center tabular-nums"
										>{player.pointsOnly ? '—' : player.ast}</td
									>
									<td class="py-2 text-center tabular-nums"
										>{player.pointsOnly ? '—' : player.stl}</td
									>
									<td class="py-2 text-center tabular-nums"
										>{player.pointsOnly ? '—' : player.blk}</td
									>
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
