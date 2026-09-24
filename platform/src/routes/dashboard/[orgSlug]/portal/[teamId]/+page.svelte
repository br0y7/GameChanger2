<script lang="ts">
	import { resolve } from '$app/paths';
	import { getTeam } from '$lib/api/team.remote';
	import { getTeamOverview } from '$lib/api/team-overview.remote';
	import { getPortalTeamContext } from '$lib/api/coach-portal.remote';
	import {
		getCoachLatestGameRatings,
		getCoachTeamDevelopment,
		getCoachTeamPlayerStats,
	} from '$lib/api/coach-player-stats.remote';
	import GameRatingDetail, {
		type GameRatingDetailModel,
	} from '$lib/components/GameRatingDetail.svelte';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();

	const context = $derived(await getPortalTeamContext({ teamId: params.teamId }));
	const team = $derived(await getTeam({ id: params.teamId, include: { players: true } }));
	const season = $derived(context?.season);
	const division = $derived(context?.division);

	const overview = $derived(
		season && division
			? await getTeamOverview({
					teamId: team.id,
					divisionId: division.id,
					seasonId: season.id,
				})
			: null
	);

	const playerStats = $derived(await getCoachTeamPlayerStats({ teamId: params.teamId }));
	const latestRatings = $derived(await getCoachLatestGameRatings({ teamId: params.teamId }));
	let ratingOpen = $state(false);
	let ratingDetail = $state<GameRatingDetailModel | null>(null);

	function openRating(player: NonNullable<typeof latestRatings>['players'][number]) {
		ratingDetail = {
			playerName: player.name,
			opponentName: latestRatings?.opponentName,
			rating: player.gameRating,
			meaning: player.meaning,
			points: player.pts,
			rebounds: player.reb,
			offensiveRebounds: player.oreb,
			assists: player.ast,
			steals: player.stl,
			blocks: player.blk,
			turnovers: player.tov,
			breakdown: player.breakdown,
		};
		ratingOpen = true;
	}

	function trendLabel(trend: 'up' | 'flat' | 'down', delta: number | null) {
		const arrow = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→';
		if (delta == null || trend === 'flat') return arrow;
		const sign = delta > 0 ? '+' : '';
		return `${arrow} ${sign}${delta.toFixed(1)}`;
	}
	const development = $derived(await getCoachTeamDevelopment({ teamId: params.teamId }));

	const base = $derived(
		resolve('/dashboard/[orgSlug]/portal/[teamId]', {
			orgSlug: params.orgSlug,
			teamId: params.teamId,
		})
	);

	const nextGame = $derived(overview?.nextGame ?? null);

	const games = $derived(
		[...(overview?.schedule ?? [])].sort((a, b) => {
			const aAt = (a.scheduledAt ?? a.completedAt)?.getTime() ?? 0;
			const bAt = (b.scheduledAt ?? b.completedAt)?.getTime() ?? 0;
			return aAt - bAt;
		})
	);

	const teamAverages = $derived.by(() => {
		const withGames = playerStats.rows.filter((r) => r.gp > 0);
		if (!withGames.length) return null;
		const n = withGames.length;
		return {
			ppg: withGames.reduce((s, r) => s + r.ppg, 0) / n,
			rpg: withGames.reduce((s, r) => s + r.rpg, 0) / n,
			apg: withGames.reduce((s, r) => s + r.apg, 0) / n,
		};
	});

	function fmt(n: number) {
		return n.toFixed(1);
	}

	function formatGameDate(d: Date | null | undefined) {
		if (!d) return 'TBD';
		return d.toLocaleDateString('en-US', {
			weekday: 'long',
			month: 'short',
			day: 'numeric',
		});
	}

	function formatGameTime(d: Date | null | undefined) {
		if (!d) return null;
		const hasTime = d.getHours() !== 0 || d.getMinutes() !== 0;
		if (!hasTime) return null;
		return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
	}

	function formatShortDate(d: Date | null | undefined) {
		if (!d) return 'TBD';
		return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	}

	function playerHref(playerId: string) {
		return resolve('/dashboard/[orgSlug]/portal/[teamId]/player-stats/[playerId]', {
			orgSlug: params.orgSlug,
			teamId: params.teamId,
			playerId,
		});
	}
</script>

{#if overview}
	<section class="space-y-6">
		<header>
			<h2 class="text-2xl font-bold tracking-tight sm:text-3xl">{team.name}</h2>
			<p class="mt-1 text-sm text-[#8B949E]">
				{season?.name ?? 'Season'}
				{#if division}
					· {division.name}
				{/if}
			</p>
		</header>

		<div class="grid gap-4 lg:grid-cols-2">
			<section class="rounded-2xl border border-[#2A3038] bg-[#161B22] p-5">
				<p class="text-xs font-semibold tracking-wide text-[#8B949E] uppercase">Next Game</p>
				{#if nextGame}
					<p class="mt-3 text-lg font-bold">{formatGameDate(nextGame.scheduledAt)}</p>
					<p class="mt-1 text-base text-[#E6EDF3]">vs. {nextGame.opponentName}</p>
					{#if formatGameTime(nextGame.scheduledAt)}
						<p class="mt-1 text-sm text-[#8B949E]">{formatGameTime(nextGame.scheduledAt)}</p>
					{/if}
					<a
						href={`${base}/games`}
						class="mt-4 inline-flex rounded-md bg-[#58A6FF] px-3 py-2 text-sm font-semibold text-[#0D1117]"
					>
						View schedule
					</a>
				{:else}
					<p class="mt-3 text-sm text-[#8B949E]">No upcoming game scheduled.</p>
				{/if}
			</section>

			<section class="rounded-2xl border border-[#2A3038] bg-[#161B22] p-5">
				<p class="text-xs font-semibold tracking-wide text-[#8B949E] uppercase">Season Record</p>
				<p class="mt-3 text-2xl font-bold tabular-nums">
					{overview.record.wins} Wins
					<span class="text-[#8B949E]">|</span>
					{overview.record.losses} Losses
				</p>
				{#if teamAverages}
					<p class="mt-3 text-sm text-[#8B949E]">
						Team avg · {fmt(teamAverages.ppg)} PPG · {fmt(teamAverages.rpg)} RPG ·
						{fmt(teamAverages.apg)} APG
					</p>
				{/if}
				{#if overview.ppg}
					<p class="mt-1 text-xs text-[#8B949E]">
						Scoring {fmt(overview.ppg)} PPG · Opp {fmt(overview.oppPpg)} PPG
					</p>
				{/if}
			</section>
		</div>

		{#if latestRatings && latestRatings.players.length > 0}
			<section class="rounded-2xl border border-[#2A3038] bg-[#161B22] p-5">
				<h3 class="text-sm font-semibold tracking-wide text-[#8B949E] uppercase">
					Latest game
				</h3>
				<p class="mt-1 text-sm text-[#E6EDF3]">
					vs {latestRatings.opponentName}
					<span class="tabular-nums text-[#8B949E]">
						· {latestRatings.teamScore}–{latestRatings.oppScore}
					</span>
				</p>
				<div class="mt-4 overflow-x-auto">
					<table class="w-full min-w-[520px] text-left text-sm">
						<thead class="border-b border-[#2A3038] text-xs tracking-wide text-[#8B949E] uppercase">
							<tr>
								<th class="pb-2 font-medium">Player</th>
								<th class="pb-2 font-medium tabular-nums">Game Rating</th>
								<th class="pb-2 font-medium tabular-nums">Average Game Rating</th>
								<th class="pb-2 font-medium">vs Avg</th>
							</tr>
						</thead>
						<tbody>
							{#each latestRatings.players as player (player.playerId)}
								<tr class="border-b border-[#2A3038]/50">
									<td class="py-2.5">
										<button
											type="button"
											class="font-medium text-[#58A6FF] hover:underline"
											onclick={() => openRating(player)}
										>
											{player.name}
										</button>
									</td>
									<td class="py-2.5 tabular-nums font-semibold">{player.gameRating.toFixed(1)}</td>
									<td class="py-2.5 tabular-nums text-[#8B949E]">
										{player.seasonAverage == null ? '—' : player.seasonAverage.toFixed(1)}
									</td>
									<td class="py-2.5 tabular-nums">{trendLabel(player.trend, player.delta)}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</section>
		{/if}

		<section class="rounded-2xl border border-[#2A3038] bg-[#161B22] p-5">
			<div class="flex flex-wrap items-center justify-between gap-2">
				<div>
					<h3 class="text-sm font-semibold tracking-wide text-[#8B949E] uppercase">My Team</h3>
					<p class="mt-1 text-sm text-[#8B949E]">
						Roster, jersey numbers, and season averages
					</p>
				</div>
				<a href={`${base}/player-stats`} class="text-sm text-[#58A6FF] hover:underline">
					Full player stats →
				</a>
			</div>

			{#if playerStats.rows.length === 0}
				<p class="mt-4 text-sm text-[#8B949E]">No players on this roster yet.</p>
			{:else}
				<div class="mt-4 overflow-x-auto">
					<table class="w-full min-w-[520px] text-left text-sm">
						<thead class="border-b border-[#2A3038] text-xs tracking-wide text-[#8B949E] uppercase">
							<tr>
								<th class="pb-2 font-medium">Player</th>
								<th class="pb-2 font-medium tabular-nums">#</th>
								<th class="pb-2 font-medium tabular-nums">GP</th>
								<th class="pb-2 font-medium tabular-nums">PPG</th>
								<th class="pb-2 font-medium tabular-nums">RPG</th>
								<th class="pb-2 font-medium tabular-nums">APG</th>
							</tr>
						</thead>
						<tbody>
							{#each playerStats.rows as row (row.playerId)}
								<tr class="border-b border-[#2A3038]/50">
									<td class="py-2.5">
										<a
											href={playerHref(row.playerId)}
											class="font-medium text-[#58A6FF] hover:underline"
										>
											{row.name}
										</a>
									</td>
									<td class="py-2.5 tabular-nums text-[#8B949E]">{row.jerseyNumber}</td>
									<td class="py-2.5 tabular-nums">{row.gp}</td>
									<td class="py-2.5 tabular-nums">{fmt(row.ppg)}</td>
									<td class="py-2.5 tabular-nums">{fmt(row.rpg)}</td>
									<td class="py-2.5 tabular-nums">{fmt(row.apg)}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</section>

		<section class="rounded-2xl border border-[#2A3038] bg-[#161B22] p-5">
			<div class="flex flex-wrap items-center justify-between gap-2">
				<div>
					<h3 class="text-sm font-semibold tracking-wide text-[#8B949E] uppercase">Games</h3>
					<p class="mt-1 text-sm text-[#8B949E]">Your team schedule only</p>
				</div>
				<a href={`${base}/games`} class="text-sm text-[#58A6FF] hover:underline">All games →</a>
			</div>

			{#if games.length === 0}
				<p class="mt-4 text-sm text-[#8B949E]">No games for this team yet.</p>
			{:else}
				<div class="mt-4 overflow-x-auto">
					<table class="w-full min-w-[520px] text-left text-sm">
						<thead class="border-b border-[#2A3038] text-xs tracking-wide text-[#8B949E] uppercase">
							<tr>
								<th class="pb-2 font-medium">Date</th>
								<th class="pb-2 font-medium">Opponent</th>
								<th class="pb-2 font-medium">Result</th>
								<th class="pb-2 font-medium">Status</th>
							</tr>
						</thead>
						<tbody>
							{#each games as game (game.id)}
								<tr class="border-b border-[#2A3038]/50">
									<td class="py-2.5 text-[#8B949E]">
										{formatShortDate(game.scheduledAt ?? game.completedAt)}
									</td>
									<td class="py-2.5">{game.opponentName}</td>
									<td class="py-2.5">
										{#if game.result && game.teamScore != null && game.oppScore != null}
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
									<td class="py-2.5 text-[#8B949E]">
										{game.status === 'upcoming'
											? 'Upcoming'
											: game.status === 'completed'
												? 'Complete'
												: 'Cancelled'}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
			<p class="mt-3 text-xs text-[#8B949E]">
				Stat submission coming later: coach submits → admin reviews → official stats published.
			</p>
		</section>

		<section class="rounded-2xl border border-[#2A3038] bg-[#161B22] p-5">
			<div class="flex flex-wrap items-center justify-between gap-2">
				<div>
					<h3 class="text-sm font-semibold tracking-wide text-[#8B949E] uppercase">
						Player Development
					</h3>
					<p class="mt-1 text-sm text-[#8B949E]">
						Strengths and focus areas from game performance
					</p>
				</div>
			</div>

			{#if development.length === 0}
				<p class="mt-4 text-sm text-[#8B949E]">
					Player development insights appear after game stats are recorded.
				</p>
			{:else}
				<ul class="mt-4 space-y-3">
					{#each development as player (player.playerId)}
						<li class="rounded-xl border border-[#2A3038] bg-[#0D1117] p-4">
							<div class="flex flex-wrap items-start justify-between gap-2">
								<div>
									<a
										href={playerHref(player.playerId)}
										class="text-base font-semibold text-[#58A6FF] hover:underline"
									>
										{player.name}
									</a>
									<p class="mt-1 text-sm text-[#8B949E]">
										#{player.jerseyNumber} · PPG {fmt(player.ppg)} · RPG {fmt(player.rpg)} · APG
										{fmt(player.apg)}
									</p>
								</div>
							</div>

							<div class="mt-3 grid gap-3 sm:grid-cols-2">
								<div>
									<p class="text-xs font-semibold tracking-wide text-[#3FB950] uppercase">
										Strengths
									</p>
									{#if player.strengths.length}
										<ul class="mt-1 space-y-0.5 text-sm text-[#E6EDF3]">
											{#each player.strengths as item (item)}
												<li>{item}</li>
											{/each}
										</ul>
									{:else}
										<p class="mt-1 text-sm text-[#8B949E]">Keep building — more games help.</p>
									{/if}
								</div>
								<div>
									<p class="text-xs font-semibold tracking-wide text-[#F0A020] uppercase">
										Development Areas
									</p>
									{#if player.developmentAreas.length}
										<ul class="mt-1 space-y-0.5 text-sm text-[#E6EDF3]">
											{#each player.developmentAreas as item (item)}
												<li>{item}</li>
											{/each}
										</ul>
									{:else}
										<p class="mt-1 text-sm text-[#8B949E]">No clear focus flags yet.</p>
									{/if}
								</div>
							</div>

							<p class="mt-3 text-xs text-[#8B949E] italic">
								Coach comments for families coming in a later phase.
							</p>
						</li>
					{/each}
				</ul>
			{/if}
		</section>
	</section>
{:else}
	<p class="text-sm text-[#8B949E]">Unable to load team overview.</p>
{/if}

<GameRatingDetail bind:open={ratingOpen} detail={ratingDetail} mode="development" askAs="player" />
