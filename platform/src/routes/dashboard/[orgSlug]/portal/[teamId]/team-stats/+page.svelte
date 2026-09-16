<script lang="ts">
	import { resolve } from '$app/paths';
	import { getTeam } from '$lib/api/team.remote';
	import { getTeamPlayerAverages, getTeamLeaders } from '$lib/api/player-game-stat.remote';
	import { getCoachTeamPlayerStats } from '$lib/api/coach-player-stats.remote';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();
	const team = $derived(await getTeam({ id: params.teamId }));
	const averages = $derived(await getTeamPlayerAverages({ teamId: team.id }));
	const leaders = $derived(await getTeamLeaders({ teamId: team.id }));
	const coachStats = $derived(await getCoachTeamPlayerStats({ teamId: team.id }));

	function formatStat(value: number, isPercent = false) {
		if (isPercent) return `${(value * 100).toFixed(1)}%`;
		return value.toFixed(1);
	}

	function formatUpdated(d: Date | null) {
		if (!d) return null;
		return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	}

	function playerHref(playerId: string) {
		return resolve('/dashboard/[orgSlug]/portal/[teamId]/player-stats/[playerId]', {
			orgSlug: params.orgSlug,
			teamId: params.teamId,
			playerId,
		});
	}
</script>

<section class="space-y-6">
	<header>
		<h2 class="text-lg font-bold tracking-tight uppercase">{team.name} — Team Stats</h2>
		<p class="mt-1 text-sm text-[#8B949E]">Leaders and averages for your roster.</p>
	</header>

	<div class="rounded-2xl border border-[#2A3038] bg-[#161B22] p-5">
		<h3 class="text-sm font-semibold tracking-wide text-[#8B949E] uppercase">Team Leaders</h3>
		{#if leaders.every((l) => !l.player)}
			<p class="mt-3 text-sm text-[#8B949E]">No stats available yet.</p>
		{:else}
			<ul class="mt-3 grid gap-2 sm:grid-cols-2">
				{#each leaders as leader (leader.key)}
					<li class="rounded-xl border border-[#2A3038] bg-[#0D1117] px-3 py-2 text-sm">
						<span class="text-[#8B949E]">{leader.label}</span>
						{#if leader.player}
							<a href={playerHref(leader.player.id)} class="ml-2 font-medium text-[#58A6FF] hover:underline"
								>{leader.player.name}</a
							>
							<span class="ml-1 tabular-nums text-[#E6EDF3]">
								{formatStat(leader.player.value, leader.player.isPercent)}
							</span>
						{:else}
							<span class="ml-2 text-[#8B949E]">—</span>
						{/if}
					</li>
				{/each}
			</ul>
		{/if}
	</div>

	<div class="rounded-2xl border border-[#2A3038] bg-[#161B22] p-5">
		<div class="flex flex-wrap items-center justify-between gap-2">
			<h3 class="text-sm font-semibold tracking-wide text-[#8B949E] uppercase">Player Averages</h3>
			<a
				href={resolve('/dashboard/[orgSlug]/portal/[teamId]/player-stats', {
					orgSlug: params.orgSlug,
					teamId: params.teamId,
				})}
				class="text-sm text-[#58A6FF] hover:underline"
			>
				Full player stats →
			</a>
		</div>
		{#if averages.length === 0}
			<p class="mt-3 text-sm text-[#8B949E]">No player averages yet.</p>
		{:else}
			<div class="mt-3 overflow-x-auto">
				<table class="w-full min-w-[480px] text-left text-sm">
					<thead class="border-b border-[#2A3038] text-[#8B949E]">
						<tr>
							<th class="pb-2 font-medium">Player</th>
							<th class="pb-2 font-medium">PPG</th>
							<th class="pb-2 font-medium">RPG</th>
							<th class="pb-2 font-medium">APG</th>
						</tr>
					</thead>
					<tbody>
						{#each averages as row (row.playerId)}
							<tr class="border-b border-[#2A3038]/50">
								<td class="py-2">
									<a href={playerHref(row.playerId)} class="text-[#58A6FF] hover:underline"
										>{row.name}</a
									>
								</td>
								<td class="py-2 tabular-nums">{row.averages.points.toFixed(1)}</td>
								<td class="py-2 tabular-nums">{row.averages.rebounds.toFixed(1)}</td>
								<td class="py-2 tabular-nums">{row.averages.assists.toFixed(1)}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>

	<p class="text-xs text-[#8B949E]">
		Stats are managed by the league organizer.
		{#if formatUpdated(coachStats.lastUpdated)}
			Last updated: {formatUpdated(coachStats.lastUpdated)}
		{/if}
	</p>
</section>
