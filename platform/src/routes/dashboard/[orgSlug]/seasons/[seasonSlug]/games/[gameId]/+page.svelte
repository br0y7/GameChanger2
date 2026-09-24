<script lang="ts">
	import type { PageProps } from './$types';
	import { getOrganization } from '$lib/api/organization.remote';
	import { getSeason } from '$lib/api/season.remote';
	import { getGameBoxScore } from '$lib/api/game.remote';
	import { PUBLIC_APP_NAME } from '$env/static/public';
	import { resolve } from '$app/paths';
	import BackLink from '$lib/components/BackLink.svelte';
	import { teamColorFromId, teamInitials } from '$lib/utils/team-identity';
	import { askAiPanel } from '$lib/ai/ask-ai-state.svelte';
	import { gameTypeLabel } from '$lib/schemas/game';
	import GameRatingDetail, {
		type GameRatingDetailModel,
	} from '$lib/components/GameRatingDetail.svelte';

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
	const potg = $derived(box.playerOfTheGame);

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
			breakdown: player.ratingBreakdown,
		};
		ratingOpen = true;
	}

	const potgHref = $derived.by(() => {
		if (!potg?.jerseyNumber || !potg.teamSlug || !potg.divisionSlug) return null;
		return resolve(
			'/dashboard/[orgSlug]/seasons/[seasonSlug]/[divisionSlug]/[teamSlug]/[jerseyNumber]',
			{
				orgSlug: params.orgSlug,
				seasonSlug: params.seasonSlug,
				divisionSlug: potg.divisionSlug,
				teamSlug: potg.teamSlug,
				jerseyNumber: potg.jerseyNumber,
			}
		);
	});
</script>

<svelte:head>
	<title>
		{box.awayTeam.name} vs {box.homeTeam.name} | {PUBLIC_APP_NAME}
	</title>
</svelte:head>

<div class="min-h-full bg-[#0D1117] text-[#E6EDF3]">
	<div class="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 sm:py-6">
		<BackLink class="mb-4" fallbackHref={backHref} fallbackLabel={season.name} />

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
					{#if box.statsAvailable === false}
						<p class="text-3xl font-extrabold tracking-tight sm:text-4xl">
							{box.awayTeam.score > box.homeTeam.score ? 'W' : 'L'}
							<span class="mx-1 text-[#8B949E]">–</span>
							{box.homeTeam.score > box.awayTeam.score ? 'W' : 'L'}
						</p>
						<p class="mt-1 text-sm text-[#8B949E]">Result only · no box score</p>
					{:else}
						<p class="text-3xl font-extrabold tracking-tight tabular-nums sm:text-4xl">
							{box.awayTeam.score}
							<span class="mx-1 text-[#8B949E]">–</span>
							{box.homeTeam.score}
						</p>
					{/if}
					{#if dateLabel}
						<p class="mt-1 text-sm text-[#8B949E]">
							{dateLabel}
							{#if box.gameType === 'playoff'}
								<span class="mx-1.5 text-[#2A3038]">·</span>
								<span class="font-medium text-[#F0A020]">Playoff</span>
							{:else if box.gameType === 'finals'}
								<span class="mx-1.5 text-[#2A3038]">·</span>
								<span class="font-medium text-[#A371F7]">Finals</span>
							{/if}
						</p>
					{:else if box.gameType === 'playoff' || box.gameType === 'finals'}
						<p
							class="mt-1 text-sm font-medium {box.gameType === 'finals'
								? 'text-[#A371F7]'
								: 'text-[#F0A020]'}"
						>
							{gameTypeLabel(box.gameType)}
						</p>
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

		{#if potg && box.statsAvailable !== false}
			<section class="mb-5 rounded-2xl border border-[#2A3038] bg-[#161B22] p-5 sm:p-6">
				<p class="mb-3 text-xs font-semibold tracking-wide text-[#F0A020] uppercase">
					Player of the Game
				</p>
				<div class="flex flex-wrap items-center justify-between gap-4">
					<div class="min-w-0">
						{#if potgHref}
							<a href={potgHref} class="text-xl font-bold text-[#E6EDF3] hover:text-[#58A6FF]">
								#{potg.jerseyNumber}
								{potg.name}
							</a>
						{:else}
							<p class="text-xl font-bold">
								#{potg.jerseyNumber}
								{potg.name}
							</p>
						{/if}
						<p class="mt-0.5 text-sm text-[#8B949E]">{potg.teamName}</p>
					</div>
					<div class="flex gap-4 text-center text-sm">
						<div>
							<p class="text-xs tracking-wide text-[#8B949E] uppercase">PTS</p>
							<p class="text-lg font-bold tabular-nums">{potg.pts}</p>
						</div>
						<div>
							<p class="text-xs tracking-wide text-[#8B949E] uppercase">REB</p>
							<p class="text-lg font-bold tabular-nums">{potg.reb}</p>
						</div>
						<div>
							<p class="text-xs tracking-wide text-[#8B949E] uppercase">AST</p>
							<p class="text-lg font-bold tabular-nums">{potg.ast}</p>
						</div>
					</div>
				</div>
			</section>
		{/if}

		{#if box.statsAvailable === false}
			<section class="mb-5 rounded-2xl border border-[#2A3038] bg-[#161B22] p-5 sm:p-6">
				<p class="text-sm text-[#8B949E]">
					This game was recorded as Win / Lose / Default Lose only (e.g. a default/forfeit).
					No player box score is available.
				</p>
			</section>
		{:else}
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
										<th class="py-2 text-center font-medium">Rating</th>
									</tr>
								</thead>
								<tbody>
									{#each side.players as player (player.playerId)}
										<tr
											class="border-b border-[#2A3038] last:border-0 {potg?.playerId ===
											player.playerId
												? 'bg-[#F0A020]/10'
												: ''}"
										>
											<td class="py-2.5 tabular-nums text-[#8B949E]">{player.jerseyNumber}</td>
											<td class="py-2.5 font-medium">
												{player.name}
												{#if potg?.playerId === player.playerId}
													<span class="ml-2 text-xs font-semibold text-[#F0A020]">POTG</span>
												{/if}
											</td>
											<td class="py-2.5 text-center font-semibold tabular-nums">{player.pts}</td>
											<td class="py-2.5 text-center tabular-nums">{player.reb}</td>
											<td class="py-2.5 text-center tabular-nums">{player.ast}</td>
											<td class="py-2.5 text-center tabular-nums">{player.fgm}-{player.fga}</td>
											<td class="py-2.5 text-center tabular-nums">{player.fg3m}-{player.fg3a}</td>
											<td class="py-2.5 text-center tabular-nums">{player.ftm}-{player.fta}</td>
											<td class="py-2.5 text-center tabular-nums">{player.stl}</td>
											<td class="py-2.5 text-center tabular-nums">{player.blk}</td>
											<td class="py-2.5 text-center tabular-nums">{player.tov}</td>
											<td class="py-2.5 text-center tabular-nums">
												{#if player.gameRating != null}
													<button
														type="button"
														class="font-semibold text-[#58A6FF] hover:underline"
														onclick={() =>
															openRating(
																player,
																side.id === box.homeTeam.id
																	? box.awayTeam.name
																	: box.homeTeam.name
															)}
													>
														{player.gameRating.toFixed(1)}
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
			{/each}
		{/if}
	</div>
</div>

<GameRatingDetail bind:open={ratingOpen} detail={ratingDetail} mode="development" askAs="player" />
