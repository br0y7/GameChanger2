<script lang="ts">
	import { getFamilyPlayerHome } from '$lib/api/family.remote';
	import { gameTypeClass, gameTypeLabel } from '$lib/schemas/game';
	import GameBoxScoreLink from '$lib/components/GameBoxScoreLink.svelte';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();
	const home = $derived(await getFamilyPlayerHome({ playerId: params.playerId }));

	function formatDate(d: Date | null | undefined) {
		if (!d) return 'TBD';
		return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	}
</script>

<section class="rounded-2xl border border-[#2A3038] bg-[#161B22]/80 p-5">
	<p class="text-xs font-semibold tracking-wide text-[#8B949E] uppercase">Schedule</p>
	<p class="mt-1 text-sm text-[#8B949E]">{home.player.teamName} games this season</p>

	{#if home.schedule.length === 0}
		<p class="mt-4 text-sm text-[#8B949E]">No games scheduled yet.</p>
	{:else}
		<ul class="mt-4 space-y-2">
			{#each home.schedule as game (game.id)}
				<li
					class="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#2A3038] bg-[#0D1117]/60 px-4 py-3 text-sm"
				>
					<div>
						<p class="font-medium">
							vs {game.opponentName}
							{#if game.status === 'completed'}
								<span class="ml-2 font-normal text-[#8B949E]">
									{formatDate(game.completedAt ?? game.scheduledAt)}
								</span>
							{/if}
						</p>
						<p class="text-xs {gameTypeClass(game.gameType)}">{gameTypeLabel(game.gameType)}</p>
						{#if game.status === 'completed' && game.playerLine}
							<p class="text-xs text-[#8B949E]">
								{game.playerLine.pts} PTS{#if !game.playerLine.pointsOnly}
									· {game.playerLine.reb} REB · {game.playerLine.ast} AST{/if}
							</p>
						{:else if game.status === 'completed'}
							<p class="text-xs text-[#8B949E]">Did not play</p>
						{:else if game.status !== 'completed'}
							<p class="text-xs text-[#8B949E]">{formatDate(game.scheduledAt)}</p>
						{/if}
					</div>
					<div class="text-right">
						{#if game.result && game.teamScore != null && game.scoreLabel}
							<GameBoxScoreLink
								orgSlug={params.orgSlug}
								seasonSlug={home.player.seasonSlug}
								gameId={game.id}
								class="font-medium {game.result === 'W'
									? 'text-[#3FB950]'
									: game.result === 'L'
										? 'text-[#F85149]'
										: 'text-[#8B949E]'}"
							>
								{game.scoreLabel}
							</GameBoxScoreLink>
						{:else}
							<p class="text-[#8B949E]">Upcoming</p>
						{/if}
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</section>
