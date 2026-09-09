<script lang="ts">
	import { getTeamLeaders } from '$lib/api/player-game-stat.remote';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';

	interface Props {
		teamId: string;
		teamSlug: string;
	}

	let { teamId, teamSlug }: Props = $props();

	const leaders = $derived(await getTeamLeaders({ teamId }));

	const formatValue = (value: number, isPercent = false) =>
		isPercent
			? `${(value * 100).toLocaleString('en-US', { maximumFractionDigits: 0 })}%`
			: value.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
</script>

<section class="rounded-2xl border border-[#2A3038] bg-[#161B22] p-5 sm:p-6">
	<h2 class="mb-4 text-sm font-semibold tracking-wide text-[#8B949E] uppercase">Team Leaders</h2>

	{#if leaders.every((leader) => !leader.player)}
		<p class="text-sm text-[#8B949E]">No game stats yet — import a spreadsheet to see leaders.</p>
	{:else}
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
			{#each leaders as leader (leader.key)}
				<div class="rounded-xl border border-[#2A3038] bg-[#0D1117] p-4">
					<p class="mb-2 text-xs font-medium tracking-wide text-[#8B949E] uppercase">
						{leader.label}
					</p>
					{#if leader.player}
						{@const player = leader.player}
						<a
							href={resolve(
								'/dashboard/[orgSlug]/seasons/[seasonSlug]/[divisionSlug]/[teamSlug]/[jerseyNumber]',
								{
									orgSlug: page.params.orgSlug!,
									seasonSlug: page.params.seasonSlug!,
									divisionSlug: page.params.divisionSlug!,
									teamSlug,
									jerseyNumber: player.jerseyNumber ?? '',
								}
							)}
							class="block truncate text-sm font-semibold text-[#E6EDF3] hover:text-[#58A6FF] hover:underline"
						>
							{player.name}
						</a>
						<p class="mt-1 text-2xl font-bold tracking-tight text-[#E6EDF3]">
							{formatValue(player.value, player.isPercent)}
						</p>
					{:else}
						<p class="text-sm text-[#8B949E]">—</p>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</section>
