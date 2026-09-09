<script lang="ts">
	import { getTeamPlayerAverages } from '$lib/api/player-game-stat.remote';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import * as Table from '$lib/components/ui/table/index.js';

	interface Props {
		teamId: string;
		teamSlug: string;
	}

	let { teamId, teamSlug }: Props = $props();

	const players = $derived(await getTeamPlayerAverages({ teamId }));

	const formatAvg = (value: number) =>
		value.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

	const formatPct = (value: number) =>
		`${(value * 100).toLocaleString('en-US', { maximumFractionDigits: 0 })}%`;
</script>

<section class="rounded-2xl border border-[#2A3038] bg-[#161B22] p-5 sm:p-6">
	<h2 class="mb-4 text-sm font-semibold tracking-wide text-[#8B949E] uppercase">Player Averages</h2>

	{#if players.length === 0}
		<p class="text-sm text-[#8B949E]">No game stats yet — import a spreadsheet to see averages.</p>
	{:else}
		<div class="overflow-x-auto">
			<Table.Root>
				<Table.Header>
					<Table.Row class="border-[#2A3038] hover:bg-transparent">
						<Table.Head class="text-[#8B949E]">Player</Table.Head>
						<Table.Head class="text-center text-[#8B949E]">GP</Table.Head>
						<Table.Head class="text-center text-[#8B949E]">PTS</Table.Head>
						<Table.Head class="text-center text-[#8B949E]">REB</Table.Head>
						<Table.Head class="text-center text-[#8B949E]">AST</Table.Head>
						<Table.Head class="text-center text-[#8B949E]">FG%</Table.Head>
						<Table.Head class="text-center text-[#8B949E]">3P%</Table.Head>
						<Table.Head class="text-center text-[#8B949E]">FT%</Table.Head>
						<Table.Head class="text-center text-[#8B949E]">STL</Table.Head>
						<Table.Head class="text-center text-[#8B949E]">BLK</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each players as player (player.playerId)}
						{@const avg = player.averages}
						<Table.Row class="border-[#2A3038] hover:bg-white/5">
							<Table.Cell>
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
									class="font-medium text-[#E6EDF3] hover:text-[#58A6FF] hover:underline"
								>
									{player.name}
								</a>
								{#if player.jerseyNumber}
									<span class="ml-1 text-[#8B949E]">#{player.jerseyNumber}</span>
								{/if}
							</Table.Cell>
							<Table.Cell class="text-center tabular-nums text-[#E6EDF3]">{avg.gamesPlayed}</Table.Cell>
							<Table.Cell class="text-center tabular-nums text-[#E6EDF3]">{formatAvg(avg.points)}</Table.Cell>
							<Table.Cell class="text-center tabular-nums text-[#E6EDF3]">{formatAvg(avg.rebounds)}</Table.Cell>
							<Table.Cell class="text-center tabular-nums text-[#E6EDF3]">{formatAvg(avg.assists)}</Table.Cell>
							<Table.Cell class="text-center tabular-nums text-[#E6EDF3]">{formatPct(avg.fgPct)}</Table.Cell>
							<Table.Cell class="text-center tabular-nums text-[#E6EDF3]">{formatPct(avg.fg3Pct)}</Table.Cell>
							<Table.Cell class="text-center tabular-nums text-[#E6EDF3]">{formatPct(avg.ftPct)}</Table.Cell>
							<Table.Cell class="text-center tabular-nums text-[#E6EDF3]">{formatAvg(avg.steals)}</Table.Cell>
							<Table.Cell class="text-center tabular-nums text-[#E6EDF3]">{formatAvg(avg.blocks)}</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</div>
	{/if}
</section>
