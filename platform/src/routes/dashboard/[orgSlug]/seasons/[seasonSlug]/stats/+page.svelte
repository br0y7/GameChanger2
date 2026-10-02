<script lang="ts">
	import { PUBLIC_APP_NAME } from '$env/static/public';
	import { resolve } from '$app/paths';
	import { getDemoAccess } from '$lib/api/demo.remote';
	import { getOrganization } from '$lib/api/organization.remote';
	import {
		getSeason,
		getSeasonPlayerStats,
		getSeasonStandings,
		getSeasonStats,
	} from '$lib/api/season.remote';
	import { getSeasonTeams, getSeasonGames } from '$lib/api/league-manage.remote';
	import { gameTypeLabel } from '$lib/schemas/game';
	import AnimatedNumber from '$lib/components/AnimatedNumber.svelte';
	import type { PageProps } from './$types';
	import BackLink from '$lib/components/BackLink.svelte';

	let { params }: PageProps = $props();

	const org = $derived(await getOrganization({ slug: params.orgSlug }));
	const season = $derived(await getSeason({ slug: params.seasonSlug, organizationId: org.id }));
	const stats = $derived(await getSeasonStats({ seasonId: season.id }));
	const teams = $derived(await getSeasonTeams({ seasonId: season.id }));
	const games = $derived(await getSeasonGames({ seasonId: season.id }));
	const demo = $derived(await getDemoAccess());

	type HubTab = 'players' | 'standings' | 'schedule';
	type SortKey =
		| 'name'
		| 'teamName'
		| 'divisionName'
		| 'gp'
		| 'ppg'
		| 'rpg'
		| 'apg'
		| 'fgPct'
		| 'fg3Pct'
		| 'ftPct'
		| 'spg'
		| 'bpg';

	let activeTab = $state<HubTab>('players');
	let divisionSlug = $state('');
	let teamSlug = $state('');
	let sortKey = $state<SortKey>('ppg');
	let sortDir = $state<'asc' | 'desc'>('desc');

	const playerStats = $derived(
		await getSeasonPlayerStats({
			seasonId: season.id,
			divisionSlug: divisionSlug || undefined,
			teamSlug: teamSlug || undefined,
		})
	);
	const standings = $derived(
		await getSeasonStandings({
			seasonId: season.id,
			divisionSlug: divisionSlug || undefined,
		})
	);

	const numberFormatter = new Intl.NumberFormat('en', {
		style: 'decimal',
		maximumFractionDigits: 0,
	});
	const format = (n: number) => numberFormatter.format(n);

	const formatDate = (date: Date | null | undefined) => {
		if (!date) return 'TBD';
		return new Date(date).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
		});
	};

	const formatAvg = (value: number) =>
		value.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
	const formatPct = (value: number) =>
		`${(Math.min(1, Math.max(0, value)) * 100).toLocaleString('en-US', {
			maximumFractionDigits: 0,
		})}%`;

	const divisions = $derived(
		[...new Map(teams.map((team) => [team.divisionSlug, team.divisionName])).entries()].map(
			([slug, name]) => ({ slug, name })
		)
	);
	const divisionTeams = $derived(
		divisionSlug ? teams.filter((team) => team.divisionSlug === divisionSlug) : teams
	);
	const filteredGames = $derived(
		divisionSlug
			? games.filter(
					(game) =>
						game.homeTeam.divisionSlug === divisionSlug ||
						game.awayTeam.divisionSlug === divisionSlug
				)
			: games
	);

	const sortedPlayers = $derived(
		[...playerStats].sort((a, b) => {
			const left = a[sortKey];
			const right = b[sortKey];
			const cmp =
				typeof left === 'string'
					? left.localeCompare(typeof right === 'string' ? right : String(right))
					: (left as number) - (right as number);
			return sortDir === 'asc' ? cmp : -cmp;
		})
	);

	const adminHref = $derived(resolve('/dashboard/[orgSlug]', { orgSlug: params.orgSlug }));
	const backLabel = $derived(demo ? 'Demo home' : 'Admin Dashboard');

	const tabs: { id: HubTab; label: string }[] = [
		{ id: 'players', label: 'Player stats' },
		{ id: 'standings', label: 'Team standings' },
		{ id: 'schedule', label: 'Schedule' },
	];

	function teamHref(divisionSlugValue: string, teamSlugValue: string) {
		return resolve('/dashboard/[orgSlug]/seasons/[seasonSlug]/[divisionSlug]/[teamSlug]', {
			orgSlug: params.orgSlug,
			seasonSlug: params.seasonSlug,
			divisionSlug: divisionSlugValue,
			teamSlug: teamSlugValue,
		});
	}

	function playerHref(player: (typeof playerStats)[number]) {
		return resolve(
			'/dashboard/[orgSlug]/seasons/[seasonSlug]/[divisionSlug]/[teamSlug]/[jerseyNumber]',
			{
				orgSlug: params.orgSlug,
				seasonSlug: params.seasonSlug,
				divisionSlug: player.divisionSlug,
				teamSlug: player.teamSlug,
				jerseyNumber: player.jerseyNumber || '0',
			}
		);
	}

	function boxHref(gameId: string) {
		return resolve('/dashboard/[orgSlug]/seasons/[seasonSlug]/games/[gameId]', {
			orgSlug: params.orgSlug,
			seasonSlug: params.seasonSlug,
			gameId,
		});
	}

	function toggleSort(key: SortKey) {
		if (sortKey === key) {
			sortDir = sortDir === 'desc' ? 'asc' : 'desc';
			return;
		}
		sortKey = key;
		sortDir = key === 'name' || key === 'teamName' || key === 'divisionName' ? 'asc' : 'desc';
	}

	function sortClass(key: SortKey) {
		return sortKey === key ? 'text-[#E6EDF3]' : 'text-[#8B949E]';
	}

	const glance = $derived([
		{ label: 'Games', value: stats.gameCount },
		{ label: 'Teams', value: stats.teamCount },
		{ label: 'Players', value: stats.playerCount },
		{ label: 'Divisions', value: stats.divisionCount },
	]);
</script>

<svelte:head>
	<title>{season.name} Stats | {PUBLIC_APP_NAME}</title>
</svelte:head>

<div class="min-h-full bg-[#0D1117] text-[#E6EDF3]">
	<div class="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6">
		<BackLink fallbackHref={adminHref} fallbackLabel={backLabel} />

		<header class="rounded-2xl border border-[#2A3038] bg-[#161B22] p-5 sm:p-6">
			<p class="text-xs font-semibold tracking-wide text-[#8B949E] uppercase">Stats</p>
			<h1 class="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{season.name}</h1>
			<p class="mt-1 text-sm text-[#8B949E]">{org.name}</p>
		</header>

		<section class="grid grid-cols-2 gap-3 sm:grid-cols-4">
			{#each glance as card (card.label)}
				<div class="rounded-2xl border border-[#2A3038] bg-[#161B22] p-4">
					<p class="text-xs font-semibold tracking-wide text-[#8B949E] uppercase">{card.label}</p>
					<p class="mt-2 text-2xl font-bold tabular-nums">
						<AnimatedNumber end={card.value} {format} />
					</p>
				</div>
			{/each}
		</section>

		<div class="flex flex-wrap gap-3">
			<label class="text-sm text-[#8B949E]">
				Division
				<select
					class="ml-2 rounded-md border border-[#2A3038] bg-[#0D1117] px-2 py-1.5 text-[#E6EDF3]"
					value={divisionSlug}
					onchange={(e) => {
						divisionSlug = e.currentTarget.value;
						teamSlug = '';
					}}
				>
					<option value="">All divisions</option>
					{#each divisions as d (d.slug)}
						<option value={d.slug}>{d.name}</option>
					{/each}
				</select>
			</label>
			{#if activeTab === 'players'}
				<label class="text-sm text-[#8B949E]">
					Team
					<select
						class="ml-2 rounded-md border border-[#2A3038] bg-[#0D1117] px-2 py-1.5 text-[#E6EDF3]"
						value={teamSlug}
						onchange={(e) => {
							teamSlug = e.currentTarget.value;
						}}
					>
						<option value="">All teams</option>
						{#each divisionTeams as t (t.id)}
							<option value={t.slug}>{t.name}</option>
						{/each}
					</select>
				</label>
			{/if}
		</div>

		<div class="flex gap-1 border-b border-[#2A3038]">
			{#each tabs as tab (tab.id)}
				<button
					type="button"
					class="px-4 py-2.5 text-sm font-medium transition-colors {activeTab === tab.id
						? 'border-b-2 border-[#58A6FF] text-[#E6EDF3]'
						: 'text-[#8B949E] hover:text-[#E6EDF3]'}"
					onclick={() => (activeTab = tab.id)}
				>
					{tab.label}
				</button>
			{/each}
		</div>

		{#if activeTab === 'players'}
			{#if sortedPlayers.length === 0}
				<p class="text-sm text-[#8B949E]">No player stats recorded yet.</p>
			{:else}
				<div class="overflow-x-auto rounded-2xl border border-[#2A3038] bg-[#161B22]">
					<table class="w-full min-w-[760px] text-left text-sm">
						<thead class="border-b border-[#2A3038] text-xs tracking-wide uppercase">
							<tr>
								<th class="px-4 py-3 font-medium">
									<button
										type="button"
										class={sortClass('name')}
										onclick={() => toggleSort('name')}
									>
										Player
									</button>
								</th>
								<th class="px-3 py-3 font-medium">
									<button
										type="button"
										class={sortClass('teamName')}
										onclick={() => toggleSort('teamName')}
									>
										Team
									</button>
								</th>
								<th class="px-3 py-3 font-medium">
									<button
										type="button"
										class={sortClass('divisionName')}
										onclick={() => toggleSort('divisionName')}
									>
										Division
									</button>
								</th>
								<th class="px-3 py-3 font-medium tabular-nums">
									<button type="button" class={sortClass('gp')} onclick={() => toggleSort('gp')}>
										GP
									</button>
								</th>
								<th class="px-3 py-3 font-medium tabular-nums">
									<button type="button" class={sortClass('ppg')} onclick={() => toggleSort('ppg')}>
										PTS
									</button>
								</th>
								<th class="px-3 py-3 font-medium tabular-nums">
									<button type="button" class={sortClass('rpg')} onclick={() => toggleSort('rpg')}>
										REB
									</button>
								</th>
								<th class="px-3 py-3 font-medium tabular-nums">
									<button type="button" class={sortClass('apg')} onclick={() => toggleSort('apg')}>
										AST
									</button>
								</th>
								<th class="px-3 py-3 font-medium tabular-nums">
									<button
										type="button"
										class={sortClass('fgPct')}
										onclick={() => toggleSort('fgPct')}
									>
										FG%
									</button>
								</th>
								<th class="px-3 py-3 font-medium tabular-nums">
									<button
										type="button"
										class={sortClass('fg3Pct')}
										onclick={() => toggleSort('fg3Pct')}
									>
										3P%
									</button>
								</th>
								<th class="px-3 py-3 font-medium tabular-nums">
									<button
										type="button"
										class={sortClass('ftPct')}
										onclick={() => toggleSort('ftPct')}
									>
										FT%
									</button>
								</th>
								<th class="px-3 py-3 font-medium tabular-nums">
									<button type="button" class={sortClass('spg')} onclick={() => toggleSort('spg')}>
										STL
									</button>
								</th>
								<th class="px-3 py-3 font-medium tabular-nums">
									<button type="button" class={sortClass('bpg')} onclick={() => toggleSort('bpg')}>
										BLK
									</button>
								</th>
							</tr>
						</thead>
						<tbody>
							{#each sortedPlayers as player (player.playerId)}
								<tr class="border-b border-[#2A3038]/60 hover:bg-[#0D1117]/60">
									<td class="px-4 py-3">
										<a href={playerHref(player)} class="font-medium text-[#58A6FF] hover:underline">
											{player.name}
										</a>
										{#if player.jerseyNumber}
											<span class="ml-1 text-xs text-[#8B949E]">#{player.jerseyNumber}</span>
										{/if}
									</td>
									<td class="px-3 py-3">
										<a
											href={teamHref(player.divisionSlug, player.teamSlug)}
											class="text-[#8B949E] hover:text-[#E6EDF3] hover:underline"
										>
											{player.teamName}
										</a>
									</td>
									<td class="px-3 py-3 text-[#8B949E]">{player.divisionName}</td>
									<td class="px-3 py-3 tabular-nums">{player.gp}</td>
									<td class="px-3 py-3 font-semibold tabular-nums">{formatAvg(player.ppg)}</td>
									<td class="px-3 py-3 tabular-nums">{formatAvg(player.rpg)}</td>
									<td class="px-3 py-3 tabular-nums">{formatAvg(player.apg)}</td>
									<td class="px-3 py-3 tabular-nums">{formatPct(player.fgPct)}</td>
									<td class="px-3 py-3 tabular-nums">{formatPct(player.fg3Pct)}</td>
									<td class="px-3 py-3 tabular-nums">{formatPct(player.ftPct)}</td>
									<td class="px-3 py-3 tabular-nums">{formatAvg(player.spg)}</td>
									<td class="px-3 py-3 tabular-nums">{formatAvg(player.bpg)}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		{:else if activeTab === 'standings'}
			{#if standings.length === 0 || standings.every((div) => div.rows.length === 0)}
				<p class="text-sm text-[#8B949E]">No standings yet.</p>
			{:else}
				<div class="space-y-6">
					{#each standings as div (div.id)}
						<section class="overflow-hidden rounded-2xl border border-[#2A3038] bg-[#161B22]">
							<h2
								class="border-b border-[#2A3038] px-4 py-3 text-sm font-semibold tracking-wide text-[#8B949E] uppercase"
							>
								{div.name}
							</h2>
							{#if div.rows.length === 0}
								<p class="px-4 py-3 text-sm text-[#8B949E]">No results yet.</p>
							{:else}
								<table class="w-full text-left text-sm">
									<thead
										class="border-b border-[#2A3038] text-xs tracking-wide text-[#8B949E] uppercase"
									>
										<tr>
											<th class="px-4 py-3 font-medium tabular-nums">#</th>
											<th class="px-3 py-3 font-medium">Team</th>
											<th class="px-4 py-3 text-right font-medium tabular-nums">W–L</th>
										</tr>
									</thead>
									<tbody>
										{#each div.rows as row (row.teamId)}
											<tr class="border-b border-[#2A3038]/60 last:border-0 hover:bg-[#0D1117]/60">
												<td class="px-4 py-3 text-[#8B949E] tabular-nums">{row.rank}</td>
												<td class="px-3 py-3">
													<a
														href={teamHref(div.slug, row.slug)}
														class="font-medium hover:text-[#58A6FF] hover:underline"
													>
														{row.name}
													</a>
												</td>
												<td class="px-4 py-3 text-right font-semibold tabular-nums">
													{row.wins}–{row.losses}
												</td>
											</tr>
										{/each}
									</tbody>
								</table>
							{/if}
						</section>
					{/each}
				</div>
			{/if}
		{:else if filteredGames.length === 0}
			<p class="text-sm text-[#8B949E]">No games scheduled yet.</p>
		{:else}
			<ul
				class="divide-y divide-[#2A3038] overflow-hidden rounded-2xl border border-[#2A3038] bg-[#161B22]"
			>
				{#each filteredGames as game (game.id)}
					<li>
						<a
							href={boxHref(game.id)}
							class="flex flex-col gap-1 px-4 py-3 transition-colors hover:bg-[#1C2128] sm:flex-row sm:items-center sm:justify-between"
						>
							<div class="min-w-0">
								<p class="font-medium">
									{game.awayTeam.name}
									<span class="text-[#8B949E]">@</span>
									{game.homeTeam.name}
								</p>
								<p class="text-xs text-[#8B949E]">
									{formatDate(game.completedAt ?? game.scheduledAt)} · {gameTypeLabel(
										game.gameType
									)}
								</p>
							</div>
							<p class="shrink-0 font-semibold tabular-nums">
								{game.awayTeamScore}–{game.homeTeamScore}
							</p>
						</a>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</div>
