<script lang="ts">
	import { resolve } from '$app/paths';
	import { getPortalTeamContext } from '$lib/api/coach-portal.remote';
	import { getSeasonGames } from '$lib/api/league-manage.remote';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();
	const context = $derived(await getPortalTeamContext({ teamId: params.teamId }));
	const seasonId = $derived(context?.season.id);
	const seasonSlug = $derived(context?.season.slug);
	const games = $derived(seasonId ? await getSeasonGames({ seasonId }) : []);
	const teamGames = $derived(
		games.filter((g) => g.homeTeam.id === params.teamId || g.awayTeam.id === params.teamId)
	);

	function formatDate(d: Date | null) {
		if (!d) return 'TBD';
		return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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
								{game.homeTeam.name} vs {game.awayTeam.name}
							</p>
							<p class="mt-1 text-xs text-[#8B949E]">
								{formatDate(game.scheduledAt ?? game.completedAt)} · {game.status}
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
					{#if game.status === 'completed'}
						<p class="mt-2 text-sm tabular-nums text-[#E6EDF3]">
							{game.homeTeamScore} – {game.awayTeamScore}
						</p>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
</section>
