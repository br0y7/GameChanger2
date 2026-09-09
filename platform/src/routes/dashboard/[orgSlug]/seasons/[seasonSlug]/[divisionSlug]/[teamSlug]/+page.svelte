<script lang="ts">
	import { getDivision } from '$lib/api/division.remote';
	import { getSeason } from '$lib/api/season.remote';
	import { getTeam } from '$lib/api/team.remote';
	import type { PageProps } from './$types';
	import * as Table from '$lib/components/ui/table/index.js';
	import { resolve } from '$app/paths';
	import { getOrganization } from '$lib/api/organization.remote';
	import { PUBLIC_APP_NAME } from '$env/static/public';
	import TeamLeaders from './TeamLeaders.svelte';
	import TeamPlayerAverages from './TeamPlayerAverages.svelte';
	import RosterPlayerRow from './RosterPlayerRow.svelte';
	import { getTeamOverview } from '$lib/api/team-overview.remote';
	import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left';
	import { askAiPanel } from '$lib/ai/ask-ai-state.svelte';

	let { params }: PageProps = $props();

	const org = $derived(await getOrganization({ slug: params.orgSlug }));
	const season = $derived(await getSeason({ slug: params.seasonSlug, organizationId: org.id }));
	const division = $derived(await getDivision({ slug: params.divisionSlug, seasonId: season.id }));
	const team = $derived(
		await getTeam({
			slug: params.teamSlug,
			divisionId: division.id,
			include: { players: true, coaches: true },
		})
	);
	const overview = $derived(
		await getTeamOverview({
			teamId: team.id,
			divisionId: division.id,
			seasonId: season.id,
		})
	);

	const tabs = ['Overview', 'Schedule', 'Roster', 'Stats'] as const;
	type Tab = (typeof tabs)[number];
	let activeTab = $state<Tab>('Overview');

	const formatAvg = (value: number) =>
		value.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

	const formatDate = (date: Date | null | undefined) => {
		if (!date) return 'TBD';
		return new Date(date).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
		});
	};

	const averagesByPlayerId = $derived(
		new Map(overview.rosterAverages.map((p) => [p.playerId, p]))
	);

	const rosterPreview = $derived(
		[...team.players]
			.map((player) => ({
				player,
				averages: averagesByPlayerId.get(player.id) ?? null,
			}))
			.sort((a, b) => (b.averages?.points ?? 0) - (a.averages?.points ?? 0))
	);

	const divisionTeamsHref = $derived(
		resolve('/dashboard/[orgSlug]/seasons/[seasonSlug]', {
			orgSlug: params.orgSlug,
			seasonSlug: params.seasonSlug,
		})
	);

	function gameBoxHref(gameId: string) {
		return resolve('/dashboard/[orgSlug]/seasons/[seasonSlug]/games/[gameId]', {
			orgSlug: params.orgSlug,
			seasonSlug: params.seasonSlug,
			gameId,
		});
	}
</script>

<svelte:head>
	<title>{team.name} | {PUBLIC_APP_NAME}</title>
</svelte:head>

<div class="min-h-full bg-[#0D1117] text-[#E6EDF3]">
	<div class="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 sm:py-6">
		<a
			href={divisionTeamsHref}
			class="mb-4 inline-flex items-center gap-1 text-sm text-[#8B949E] transition-colors hover:text-[#58A6FF]"
		>
			<ChevronLeftIcon class="size-4" />
			Teams / {season.name}
		</a>

		<header class="mb-5 flex items-start gap-4 rounded-2xl border border-[#2A3038] bg-[#161B22] p-4 sm:p-5">
			<div
				class="flex size-14 shrink-0 items-center justify-center rounded-full text-base font-black tracking-tight text-white sm:size-16 sm:text-lg"
				style="background-color: {overview.color}"
				aria-hidden="true"
			>
				{overview.initials}
			</div>

			<div class="min-w-0 flex-1">
				<div class="flex flex-wrap items-center gap-x-3 gap-y-1">
					<h1 class="text-2xl font-extrabold tracking-tight uppercase sm:text-3xl">{team.name}</h1>
					<button
						type="button"
						class="text-sm font-medium text-[#58A6FF] hover:underline"
						onclick={() => askAiPanel.openPanel(`Summarize ${team.name}`)}
					>
						✦ Ask AI about this team
					</button>
				</div>
				<p class="mt-1 text-sm text-[#8B949E]">
					{season.name} · {overview.sportLabel}
					{#if division.name}
						· {division.name}
					{/if}
				</p>
				<p class="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium text-[#E6EDF3]">
					<span>
						Record: {overview.record.wins}–{overview.record.losses}
					</span>
					<span class="text-[#2A3038]">|</span>
					<span>
						Rank: {overview.rank ? `#${overview.rank}` : '—'}
					</span>
					{#if overview.streak}
						<span class="text-[#2A3038]">|</span>
						<span>Streak: {overview.streak}</span>
					{/if}
				</p>
				{#if overview.coachName || team.coaches?.[0]?.name}
					<p class="mt-1 text-sm text-[#8B949E]">
						Coach {overview.coachName ?? team.coaches[0].name}
					</p>
				{/if}
			</div>
		</header>

		<nav class="mb-6 flex gap-5 overflow-x-auto border-b border-[#2A3038]" aria-label="Team sections">
			{#each tabs as tab (tab)}
				<button
					type="button"
					class="shrink-0 border-b-2 pb-3 text-sm font-medium transition-colors {activeTab === tab
						? 'border-[#58A6FF] text-[#58A6FF]'
						: 'border-transparent text-[#8B949E] hover:text-[#E6EDF3]'}"
					onclick={() => (activeTab = tab)}
				>
					{tab}
				</button>
			{/each}
		</nav>

		{#if activeTab === 'Overview'}
			<div class="flex flex-col gap-5">
				<section class="rounded-2xl border border-[#2A3038] bg-[#161B22] p-5 sm:p-6">
					<h2 class="mb-4 text-sm font-semibold tracking-wide text-[#8B949E] uppercase">
						Season Snapshot
					</h2>
					<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
						<div class="rounded-xl border border-[#2A3038] bg-[#0D1117] p-4">
							<p class="text-xs font-medium tracking-wide text-[#8B949E] uppercase">Record</p>
							<p class="mt-2 text-2xl font-bold tabular-nums">
								{overview.record.wins}–{overview.record.losses}
							</p>
						</div>
						<div class="rounded-xl border border-[#2A3038] bg-[#0D1117] p-4">
							<p class="text-xs font-medium tracking-wide text-[#8B949E] uppercase">PPG</p>
							<p class="mt-2 text-2xl font-bold tabular-nums">{formatAvg(overview.ppg)}</p>
						</div>
						<div class="rounded-xl border border-[#2A3038] bg-[#0D1117] p-4">
							<p class="text-xs font-medium tracking-wide text-[#8B949E] uppercase">Opp PPG</p>
							<p class="mt-2 text-2xl font-bold tabular-nums">{formatAvg(overview.oppPpg)}</p>
						</div>
						<div class="rounded-xl border border-[#2A3038] bg-[#0D1117] p-4">
							<p class="text-xs font-medium tracking-wide text-[#8B949E] uppercase">Rank</p>
							<p class="mt-2 text-2xl font-bold tabular-nums">
								{overview.rank ? `#${overview.rank}` : '—'}
							</p>
						</div>
					</div>
				</section>

				<div class="grid gap-5 lg:grid-cols-2">
					<section class="rounded-2xl border border-[#2A3038] bg-[#161B22] p-5 sm:p-6">
						<h2 class="mb-4 text-sm font-semibold tracking-wide text-[#8B949E] uppercase">
							Recent Games
						</h2>
						{#if overview.recentGames.length === 0}
							<p class="text-sm text-[#8B949E]">No completed games yet.</p>
						{:else}
							<ul class="space-y-3">
								{#each overview.recentGames as game (game.id)}
									<li class="flex items-center justify-between gap-3 text-sm">
										<span
											class="w-6 shrink-0 font-bold {game.result === 'W'
												? 'text-[#3FB950]'
												: game.result === 'L'
													? 'text-[#F85149]'
													: 'text-[#8B949E]'}"
										>
											{game.result}
										</span>
										<a
											href={gameBoxHref(game.id)}
											class="min-w-0 flex-1 truncate text-[#E6EDF3] hover:text-[#58A6FF]"
										>
											<span class="font-semibold tabular-nums underline-offset-2 hover:underline">
												{game.teamScore}–{game.oppScore}
											</span>
											<span class="text-[#8B949E]"> vs {game.opponentName}</span>
										</a>
										<span class="shrink-0 text-[#8B949E]">{formatDate(game.completedAt)}</span>
									</li>
								{/each}
							</ul>
						{/if}
					</section>

					<section class="rounded-2xl border border-[#2A3038] bg-[#161B22] p-5 sm:p-6">
						<h2 class="mb-4 text-sm font-semibold tracking-wide text-[#8B949E] uppercase">
							Next Game
						</h2>
						{#if overview.nextGame}
							<p class="text-lg font-semibold text-[#E6EDF3]">
								vs {overview.nextGame.opponentName}
							</p>
							<p class="mt-1 text-sm text-[#8B949E]">
								{formatDate(overview.nextGame.scheduledAt)}
							</p>
						{:else}
							<p class="text-sm text-[#8B949E]">No upcoming game scheduled.</p>
						{/if}
					</section>
				</div>

				<section class="rounded-2xl border border-[#2A3038] bg-[#161B22] p-5 sm:p-6">
					<h2 class="mb-4 text-sm font-semibold tracking-wide text-[#8B949E] uppercase">
						Team Leaders
					</h2>
					{#if overview.leaders.every((l) => !l.player)}
						<p class="text-sm text-[#8B949E]">No stats yet — import a spreadsheet.</p>
					{:else}
						<div class="grid gap-4 sm:grid-cols-3">
							{#each overview.leaders as leader (leader.key)}
								<div class="rounded-xl border border-[#2A3038] bg-[#0D1117] p-4">
									<p class="text-xs font-medium tracking-wide text-[#8B949E] uppercase">
										{leader.label}
									</p>
									{#if leader.player}
										<a
											href={resolve(
												'/dashboard/[orgSlug]/seasons/[seasonSlug]/[divisionSlug]/[teamSlug]/[jerseyNumber]',
												{
													...params,
													teamSlug: team.slug,
													jerseyNumber: leader.player.jerseyNumber ?? '',
												}
											)}
											class="mt-2 block truncate font-semibold text-[#E6EDF3] hover:text-[#58A6FF] hover:underline"
										>
											{leader.player.name}
										</a>
										<p class="mt-1 text-2xl font-bold tabular-nums">
											{formatAvg(leader.player.value)}
											<span class="text-sm font-medium text-[#8B949E]">{leader.suffix}</span>
										</p>
									{:else}
										<p class="mt-2 text-sm text-[#8B949E]">—</p>
									{/if}
								</div>
							{/each}
						</div>
					{/if}
				</section>

				<section class="rounded-2xl border border-[#2A3038] bg-[#161B22] p-5 sm:p-6">
					<div class="mb-4 flex items-center justify-between gap-3">
						<h2 class="text-sm font-semibold tracking-wide text-[#8B949E] uppercase">Roster</h2>
						<button
							type="button"
							class="text-sm font-medium text-[#58A6FF] hover:underline"
							onclick={() => (activeTab = 'Roster')}
						>
							View full roster →
						</button>
					</div>
					{#if rosterPreview.length === 0}
						<p class="text-sm text-[#8B949E]">No players on this roster yet.</p>
					{:else}
						<div class="overflow-x-auto">
							<table class="w-full text-sm">
								<thead>
									<tr class="border-b border-[#2A3038] text-[#8B949E]">
										<th class="w-12 py-2 text-left font-medium">#</th>
										<th class="py-2 text-left font-medium">Player</th>
										<th class="py-2 text-center font-medium">GP</th>
										<th class="py-2 text-center font-medium">PPG</th>
										<th class="py-2 text-center font-medium">RPG</th>
										<th class="py-2 text-center font-medium">APG</th>
									</tr>
								</thead>
								<tbody>
									{#each rosterPreview.slice(0, 8) as row (row.player.id)}
										<tr class="border-b border-[#2A3038]/last:border-0">
											<td class="py-2.5 tabular-nums text-[#8B949E]">{row.player.jerseyNumber}</td>
											<td class="py-2.5">
												<a
													href={resolve(
														'/dashboard/[orgSlug]/seasons/[seasonSlug]/[divisionSlug]/[teamSlug]/[jerseyNumber]',
														{
															...params,
															teamSlug: team.slug,
															jerseyNumber: row.player.jerseyNumber ?? '',
														}
													)}
													class="font-medium hover:text-[#58A6FF] hover:underline"
												>
													{row.player.name}
												</a>
											</td>
											<td class="py-2.5 text-center tabular-nums">
												{row.averages?.gamesPlayed ?? 0}
											</td>
											<td class="py-2.5 text-center tabular-nums">
												{formatAvg(row.averages?.points ?? 0)}
											</td>
											<td class="py-2.5 text-center tabular-nums">
												{formatAvg(row.averages?.rebounds ?? 0)}
											</td>
											<td class="py-2.5 text-center tabular-nums">
												{formatAvg(row.averages?.assists ?? 0)}
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					{/if}
				</section>
			</div>
		{:else if activeTab === 'Schedule'}
			<section class="rounded-2xl border border-[#2A3038] bg-[#161B22] p-5 sm:p-6">
				<h2 class="mb-4 text-sm font-semibold tracking-wide text-[#8B949E] uppercase">Schedule</h2>
				{#if overview.recentGames.length === 0 && !overview.nextGame}
					<p class="text-sm text-[#8B949E]">No games on the schedule yet.</p>
				{:else}
					<ul class="space-y-3">
						{#if overview.nextGame}
							<li class="rounded-xl border border-[#2A3038] bg-[#0D1117] p-4">
								<p class="text-xs font-medium tracking-wide text-[#58A6FF] uppercase">Upcoming</p>
								<p class="mt-1 font-semibold">vs {overview.nextGame.opponentName}</p>
								<p class="text-sm text-[#8B949E]">{formatDate(overview.nextGame.scheduledAt)}</p>
							</li>
						{/if}
						{#each overview.recentGames as game (game.id)}
							<li class="flex items-center justify-between gap-3 rounded-xl border border-[#2A3038] bg-[#0D1117] px-4 py-3 text-sm">
								<span
									class="font-bold {game.result === 'W'
										? 'text-[#3FB950]'
										: game.result === 'L'
											? 'text-[#F85149]'
											: 'text-[#8B949E]'}"
								>
									{game.result}
								</span>
								<a
									href={gameBoxHref(game.id)}
									class="min-w-0 flex-1 truncate hover:text-[#58A6FF]"
								>
									<span class="font-semibold tabular-nums underline-offset-2 hover:underline">
										{game.teamScore}–{game.oppScore}
									</span>
									<span class="text-[#8B949E]"> vs {game.opponentName}</span>
								</a>
								<span class="text-[#8B949E]">{formatDate(game.completedAt)}</span>
							</li>
						{/each}
					</ul>
				{/if}
			</section>
		{:else if activeTab === 'Roster'}
			<section class="rounded-2xl border border-[#2A3038] bg-[#161B22] p-5 sm:p-6">
				<h2 class="mb-4 text-sm font-semibold tracking-wide text-[#8B949E] uppercase">Roster</h2>
				{#if team.players.length === 0}
					<p class="text-sm text-[#8B949E]">No players on this roster yet.</p>
				{:else}
					<div class="overflow-x-auto">
						<Table.Root>
							<Table.Header>
								<Table.Row class="border-[#2A3038] hover:bg-transparent">
									<Table.Head class="w-14 text-center text-[#8B949E]">#</Table.Head>
									<Table.Head class="text-[#8B949E]">Player</Table.Head>
									<Table.Head class="text-center text-[#8B949E]">GP</Table.Head>
									<Table.Head class="text-center text-[#8B949E]">PPG</Table.Head>
									<Table.Head class="text-center text-[#8B949E]">RPG</Table.Head>
									<Table.Head class="text-center text-[#8B949E]">APG</Table.Head>
									<Table.Head class="w-12 text-end text-[#8B949E]"></Table.Head>
								</Table.Row>
							</Table.Header>
							<Table.Body>
								{#each rosterPreview as row (row.player.id)}
									<RosterPlayerRow
										player={row.player}
										averages={row.averages}
										teamSlug={team.slug}
										divisionId={division.id}
										seasonId={season.id}
										playerHref={resolve(
											'/dashboard/[orgSlug]/seasons/[seasonSlug]/[divisionSlug]/[teamSlug]/[jerseyNumber]',
											{
												...params,
												teamSlug: team.slug,
												jerseyNumber: row.player.jerseyNumber ?? '',
											}
										)}
									/>
								{/each}
							</Table.Body>
						</Table.Root>
					</div>
				{/if}
			</section>
		{:else}
			<section class="flex flex-col gap-5">
				<TeamLeaders teamId={team.id} teamSlug={team.slug} />
				<TeamPlayerAverages teamId={team.id} teamSlug={team.slug} />
			</section>
		{/if}
	</div>
</div>
