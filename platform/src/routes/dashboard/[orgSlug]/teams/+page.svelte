<script lang="ts">
	import { PUBLIC_APP_NAME } from '$env/static/public';
	import { resolve } from '$app/paths';
	import { getOrganization } from '$lib/api/organization.remote';
	import { getCurrentSeason } from '$lib/api/season.remote';
	import { getSeasonTeams } from '$lib/api/league-manage.remote';
	import AdminTeamRename from '$lib/components/AdminTeamRename.svelte';
	import ActiveSeasonGate from '../ActiveSeasonGate.svelte';
	import type { PageProps } from './$types';
	import { redirect } from '@sveltejs/kit';

	let { params }: PageProps = $props();
	const org = $derived(await getOrganization({ slug: params.orgSlug }));

	const validateOrg = () => {
		if (org.type !== 'league') {
			redirect(303, resolve('/dashboard/[orgSlug]', { orgSlug: org.slug }));
		}
	};
	validateOrg();

	const currentSeason = $derived(await getCurrentSeason({ organizationId: org.id }));
	const teams = $derived(currentSeason ? await getSeasonTeams({ seasonId: currentSeason.id }) : []);

	const divisions = $derived([
		...new Map(
			teams.map((team) => [
				team.divisionId,
				{ id: team.divisionId, name: team.divisionName, slug: team.divisionSlug },
			])
		).values(),
	]);

	let divisionId = $state('');

	const visibleTeams = $derived(
		divisionId ? teams.filter((team) => team.divisionId === divisionId) : teams
	);

	const byDivision = $derived(
		visibleTeams.reduce(
			(acc, team) => {
				const key = team.divisionName;
				if (!acc[key]) acc[key] = [];
				acc[key].push(team);
				return acc;
			},
			{} as Record<string, typeof teams>
		)
	);

	const selectClass =
		'w-full max-w-xs rounded-md border border-[#2A3038] bg-[#0D1117] px-3 py-2 text-sm text-[#E6EDF3] focus:border-[#58A6FF] focus:outline-none';

	function teamHref(team: (typeof teams)[number]) {
		if (!currentSeason) return '#';
		return resolve('/dashboard/[orgSlug]/seasons/[seasonSlug]/[divisionSlug]/[teamSlug]', {
			orgSlug: params.orgSlug,
			seasonSlug: currentSeason.slug,
			divisionSlug: team.divisionSlug,
			teamSlug: team.slug,
		});
	}

	function manageSeasonHref() {
		if (!currentSeason) return resolve('/dashboard/[orgSlug]/seasons', { orgSlug: params.orgSlug });
		return resolve('/dashboard/[orgSlug]/seasons/[seasonSlug]', {
			orgSlug: params.orgSlug,
			seasonSlug: currentSeason.slug,
		});
	}
</script>

<svelte:head>
	<title>Teams | {org.name} | {PUBLIC_APP_NAME}</title>
</svelte:head>

<div class="min-h-full bg-[#0D1117] text-[#E6EDF3]">
	<div class="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-6">
		<header>
			<p class="text-xs font-semibold tracking-wide text-[#8B949E] uppercase">Manage</p>
			<h1 class="mt-1 text-2xl font-bold tracking-tight">Teams</h1>
			{#if currentSeason}
				<p class="mt-1 text-sm text-[#8B949E]">
					Active season: {currentSeason.name}
					·
					<a href={manageSeasonHref()} class="text-[#58A6FF] hover:underline">Manage divisions</a>
				</p>
			{/if}
		</header>

		{#if !currentSeason}
			<ActiveSeasonGate organizationId={org.id} orgSlug={params.orgSlug} />
		{:else if teams.length === 0}
			<div class="rounded-2xl border border-[#2A3038] bg-[#161B22] p-6 text-center">
				<p class="text-sm text-[#8B949E]">No teams in this season yet.</p>
				<a
					href={manageSeasonHref()}
					class="mt-4 inline-flex rounded-md bg-[#58A6FF] px-3 py-2 text-sm font-semibold text-[#0D1117]"
				>
					Add teams via divisions
				</a>
			</div>
		{:else}
			<div class="flex flex-wrap items-end gap-3">
				<label class="block text-sm text-[#8B949E]">
					Division
					<select class="{selectClass} mt-1" bind:value={divisionId}>
						<option value="">All divisions</option>
						{#each divisions as division (division.id)}
							<option value={division.id}>{division.name}</option>
						{/each}
					</select>
				</label>
				<p class="pb-2 text-sm text-[#8B949E]">
					{visibleTeams.length} team{visibleTeams.length === 1 ? '' : 's'}
				</p>
			</div>

			{#each Object.entries(byDivision) as [divisionName, divisionTeams] (divisionName)}
				<section class="space-y-2">
					<h2 class="text-sm font-semibold tracking-wide text-[#8B949E] uppercase">
						{divisionName}
					</h2>
					<ul
						class="divide-y divide-[#2A3038] overflow-hidden rounded-2xl border border-[#2A3038] bg-[#161B22]"
					>
						{#each divisionTeams as team (team.id)}
							<li class="flex items-center justify-between gap-3 px-4 py-3">
								<div class="min-w-0">
									<a href={teamHref(team)} class="truncate font-medium hover:text-[#58A6FF]">
										{team.name}
									</a>
									<p class="text-xs text-[#8B949E]">{team.playerCount} players</p>
									{#if currentSeason}
										<AdminTeamRename
											teamId={team.id}
											name={team.name}
											class="mt-1"
											onRenamed={() => {
												if (!currentSeason) return;
												void getSeasonTeams({ seasonId: currentSeason.id }).refresh();
											}}
										/>
									{/if}
								</div>
								<a
									href={teamHref(team)}
									class="inline-flex shrink-0 text-sm text-[#58A6FF] hover:underline"
								>
									View dashboard
								</a>
							</li>
						{/each}
					</ul>
				</section>
			{/each}
		{/if}
	</div>
</div>
