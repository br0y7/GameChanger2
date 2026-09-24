<script lang="ts">
	import { PUBLIC_APP_NAME } from '$env/static/public';
	import { resolve } from '$app/paths';
	import { getOrganization } from '$lib/api/organization.remote';
	import { getMyFamilyPlayers } from '$lib/api/family.remote';
	import { isUserAdmin } from '$lib/api/auth.remote';
	import { getSeasonPlayers, getSeasonTeams } from '$lib/api/league-manage.remote';
	import { getDivisions } from '$lib/api/division.remote';
	import { getSeasons } from '$lib/api/season.remote';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();
	const org = $derived(await getOrganization({ slug: params.orgSlug }));
	const canViewAll = $derived(await isUserAdmin());
	const seasons = $derived(
		canViewAll
			? [...(await getSeasons({ organizationId: org.id }))].sort(
					(a, b) => b.createdAt.getTime() - a.createdAt.getTime()
				)
			: []
	);
	const players = $derived(canViewAll ? [] : await getMyFamilyPlayers());
	const orgPlayers = $derived(players.filter((p) => p.orgSlug === params.orgSlug));

	let seasonId = $state<string | null>(null);
	let divisionId = $state('');
	let teamId = $state('');
	let search = $state('');

	const selectedSeasonId = $derived(
		seasonId ?? seasons.find((season) => season.status === 'active')?.id ?? seasons[0]?.id ?? null
	);
	const divisions = $derived(
		canViewAll && selectedSeasonId ? await getDivisions({ seasonId: selectedSeasonId }) : []
	);
	const seasonTeams = $derived(
		canViewAll && selectedSeasonId ? await getSeasonTeams({ seasonId: selectedSeasonId }) : []
	);
	const seasonPlayers = $derived(
		canViewAll && selectedSeasonId ? await getSeasonPlayers({ seasonId: selectedSeasonId }) : []
	);
	const teamsInDivision = $derived(
		divisionId ? seasonTeams.filter((team) => team.divisionId === divisionId) : seasonTeams
	);
	const activeTeamId = $derived(
		teamId && teamsInDivision.some((team) => team.id === teamId) ? teamId : ''
	);
	const filteredPlayers = $derived(
		seasonPlayers.filter((player) => {
			if (divisionId && player.divisionId !== divisionId) return false;
			if (activeTeamId && player.teamId !== activeTeamId) return false;
			const query = search.trim().toLowerCase();
			if (query && !player.name.toLowerCase().includes(query)) return false;
			return true;
		})
	);

	const selectClass =
		'w-full rounded-md border border-[#2A3038] bg-[#0D1117] px-3 py-2 text-sm text-[#E6EDF3] focus:border-[#58A6FF] focus:outline-none';

	function chooseSeason(id: string) {
		seasonId = id;
		divisionId = '';
		teamId = '';
	}
</script>

<svelte:head>
	<title>My Players | {org.name} | {PUBLIC_APP_NAME}</title>
</svelte:head>

<div class="min-h-full bg-[#0D1117] text-[#E6EDF3]">
	<div class="mx-auto w-full max-w-2xl space-y-6 px-4 py-8 sm:px-6">
		<header class="text-center">
			<p class="text-xs font-semibold tracking-wide text-[#58A6FF] uppercase">Family Portal</p>
			<h1 class="mt-2 text-2xl font-bold tracking-tight">
				{canViewAll ? 'Players' : 'My Players'}
			</h1>
			<p class="mt-1 text-sm text-[#8B949E]">
				{canViewAll
					? 'Filter by season, division, or team, or search by name.'
					: 'Choose a player to view their GameChanger page.'}
			</p>
		</header>

		{#if canViewAll}
			{#if seasons.length === 0}
				<p class="text-center text-sm text-[#8B949E]">No seasons yet.</p>
			{:else}
				<div class="grid gap-3 sm:grid-cols-2">
					<label class="block text-sm text-[#8B949E]">
						Season
						<select
							class="{selectClass} mt-1"
							value={selectedSeasonId ?? ''}
							onchange={(event) => chooseSeason(event.currentTarget.value)}
						>
							{#each seasons as season (season.id)}
								<option value={season.id}>
									{season.name}{season.status === 'active' ? ' (active)' : ''}
								</option>
							{/each}
						</select>
					</label>
					<label class="block text-sm text-[#8B949E]">
						Division
						<select
							class="{selectClass} mt-1"
							bind:value={divisionId}
							onchange={() => (teamId = '')}
						>
							<option value="">All divisions</option>
							{#each divisions as division (division.id)}
								<option value={division.id}>{division.name}</option>
							{/each}
						</select>
					</label>
					<label class="block text-sm text-[#8B949E] sm:col-span-2">
						Team
						<select class="{selectClass} mt-1" bind:value={teamId}>
							<option value="">All teams</option>
							{#each teamsInDivision as team (team.id)}
								<option value={team.id}>
									{divisionId ? team.name : `${team.name} · ${team.divisionName}`}
								</option>
							{/each}
						</select>
					</label>
					<label class="block text-sm text-[#8B949E] sm:col-span-2">
						Search
						<input
							type="search"
							bind:value={search}
							placeholder="Player name"
							class="{selectClass} mt-1 placeholder:text-[#8B949E]"
						/>
					</label>
				</div>

				<p class="text-sm text-[#8B949E]">
					{filteredPlayers.length}
					{filteredPlayers.length === 1 ? 'player' : 'players'}
				</p>

				{#if filteredPlayers.length === 0}
					<p class="text-center text-sm text-[#8B949E]">No players match these filters.</p>
				{:else}
					<ul class="space-y-3">
						{#each filteredPlayers as player (player.id)}
							<li>
								<a
									href={resolve('/dashboard/[orgSlug]/family/[playerId]', {
										orgSlug: params.orgSlug,
										playerId: player.id,
									})}
									class="block rounded-2xl border border-[#2A3038] bg-[#161B22] p-5 transition-colors hover:border-[#58A6FF]"
								>
									<p class="text-lg font-bold">{player.name}</p>
									<p class="mt-1 text-sm text-[#8B949E]">
										#{player.jerseyNumber} · {player.teamName}
										{#if player.divisionName}
											· {player.divisionName}
										{/if}
									</p>
								</a>
							</li>
						{/each}
					</ul>
				{/if}
			{/if}
		{:else if orgPlayers.length === 0}
			<p class="text-center text-sm text-[#8B949E]">No linked players in this league yet.</p>
		{:else}
			<ul class="space-y-3">
				{#each orgPlayers as player (player.playerId)}
					<li>
						<a
							href={resolve('/dashboard/[orgSlug]/family/[playerId]', {
								orgSlug: params.orgSlug,
								playerId: player.playerId,
							})}
							class="block rounded-2xl border border-[#2A3038] bg-[#161B22] p-5 transition-colors hover:border-[#58A6FF]"
						>
							<p class="text-lg font-bold">{player.name}</p>
							<p class="mt-1 text-sm text-[#8B949E]">
								#{player.jerseyNumber} · {player.teamName}
								{#if player.divisionName}
									· {player.divisionName}
								{/if}
							</p>
						</a>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</div>
