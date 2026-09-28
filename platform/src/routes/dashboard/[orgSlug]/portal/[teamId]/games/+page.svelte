<script lang="ts">
	import { resolve } from '$app/paths';
	import { getPortalTeamContext } from '$lib/api/coach-portal.remote';
	import { getSeasonGames } from '$lib/api/league-manage.remote';
	import { completedGameLabel, gameTypeClass, gameTypeLabel } from '$lib/schemas/game';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();
	const context = $derived(await getPortalTeamContext({ teamId: params.teamId }));
	const seasonId = $derived(context?.season.id);
	const seasonSlug = $derived(context?.season.slug);
	const games = $derived(seasonId ? await getSeasonGames({ seasonId }) : []);

	const teamGames = $derived.by(() => {
		const rows = games
			.filter((g) => g.homeTeam.id === params.teamId || g.awayTeam.id === params.teamId)
			.map((game) => {
				const isHome = game.homeTeam.id === params.teamId;
				const playedAt = game.completedAt ?? game.scheduledAt;
				const teamScore = isHome ? game.homeTeamScore : game.awayTeamScore;
				const oppScore = isHome ? game.awayTeamScore : game.homeTeamScore;
				const result = teamScore > oppScore ? 'W' : teamScore < oppScore ? 'L' : 'T';

				return {
					id: game.id,
					isHome,
					opponentName: isHome ? game.awayTeam.name : game.homeTeam.name,
					playedAt,
					status: game.status,
					gameType: game.gameType,
					result,
					scoreLabel: completedGameLabel({
						statsAvailable: game.statsAvailable,
						defaultLossSide: game.defaultLossSide,
						pointsOnly: game.pointsOnly,
						isHome,
						result,
						teamScore,
						oppScore,
					}),
					sortAt: playedAt?.getTime() ?? null,
				};
			});

		// Next game first, then finished games newest-first. Undated games sit at the end of their group.
		const upcoming = rows
			.filter((g) => g.status !== 'completed')
			.sort((a, b) => (a.sortAt ?? Infinity) - (b.sortAt ?? Infinity));
		const played = rows
			.filter((g) => g.status === 'completed')
			.sort((a, b) => (b.sortAt ?? 0) - (a.sortAt ?? 0));
		return [...upcoming, ...played];
	});

	function formatDate(d: Date | null) {
		if (!d) return 'TBD';
		return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	}

	function statusLabel(status: string) {
		if (status === 'upcoming') return 'Upcoming';
		if (status === 'cancelled') return 'Cancelled';
		return null;
	}
</script>

<section class="rounded-2xl border border-[#2A3038] bg-[#161B22] p-5">
	<h2 class="text-sm font-semibold tracking-wide text-[#8B949E] uppercase">Games</h2>
	<p class="mt-1 text-sm text-[#8B949E]">View only — stat entry comes in a later phase.</p>

	{#if teamGames.length === 0}
		<p class="mt-4 text-sm text-[#8B949E]">No games scheduled for this team yet.</p>
	{:else}
		<ul class="mt-4 space-y-3">
			{#each teamGames as game (game.id)}
				<li class="rounded-xl border border-[#2A3038] bg-[#0D1117] p-4">
					<div class="flex flex-wrap items-start justify-between gap-2">
						<div>
							<p class="font-medium">
								{game.isHome ? 'vs' : '@'}
								{game.opponentName}
							</p>
							<p class="mt-1 text-xs text-[#8B949E]">
								{formatDate(game.playedAt)}
								{#if statusLabel(game.status)}
									· {statusLabel(game.status)}
								{/if}
								<span class={gameTypeClass(game.gameType)}> · {gameTypeLabel(game.gameType)}</span>
							</p>
						</div>
						{#if seasonSlug}
							<a
								href={resolve('/dashboard/[orgSlug]/seasons/[seasonSlug]/games/[gameId]', {
									orgSlug: params.orgSlug,
									seasonSlug,
									gameId: game.id,
								})}
								class="text-sm text-[#58A6FF] hover:underline"
							>
								View
							</a>
						{/if}
					</div>
					{#if game.status === 'completed' && game.scoreLabel}
						<p
							class="mt-2 text-sm font-medium tabular-nums {game.result === 'W'
								? 'text-[#3FB950]'
								: game.result === 'L'
									? 'text-[#F85149]'
									: 'text-[#8B949E]'}"
						>
							{game.scoreLabel}
						</p>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
</section>
