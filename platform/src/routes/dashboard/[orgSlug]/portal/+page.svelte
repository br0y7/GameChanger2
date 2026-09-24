<script lang="ts">
	import { PUBLIC_APP_NAME } from '$env/static/public';
	import { resolve } from '$app/paths';
	import { getOrganization } from '$lib/api/organization.remote';
	import { getMyCoachAssignments } from '$lib/api/coach.remote';
	import { isUserAdmin } from '$lib/api/auth.remote';
	import { getSeasonTeams } from '$lib/api/league-manage.remote';
	import { getCurrentSeason } from '$lib/api/season.remote';
	import { coachRoleLabels } from '$lib/schemas/coach';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();
	const org = $derived(await getOrganization({ slug: params.orgSlug }));
	const canViewAll = $derived(await isUserAdmin());
	const currentSeason = $derived(
		canViewAll ? await getCurrentSeason({ organizationId: org.id }) : null
	);
	const teams = $derived(
		canViewAll && currentSeason ? await getSeasonTeams({ seasonId: currentSeason.id }) : []
	);
	const assignments = $derived(canViewAll ? [] : await getMyCoachAssignments());

	const orgAssignments = $derived(
		assignments.filter((a) => a.team?.division?.season?.organization?.slug === params.orgSlug)
	);
</script>

<svelte:head>
	<title>My Teams | {org.name} | {PUBLIC_APP_NAME}</title>
</svelte:head>

<div class="min-h-full bg-[#0D1117] text-[#E6EDF3]">
	<div class="mx-auto w-full max-w-3xl space-y-6 px-4 py-6 sm:px-6">
		<header>
			<p class="text-xs font-semibold tracking-wide text-[#8B949E] uppercase">{org.name}</p>
			<h1 class="mt-1 text-2xl font-bold tracking-tight">Coach Portal</h1>
			<p class="mt-1 text-sm text-[#8B949E]">
				{canViewAll ? 'Open any team coach dashboard.' : 'Choose a team to manage.'}
			</p>
		</header>

		{#if canViewAll}
			{#if !currentSeason}
				<p class="text-sm text-[#8B949E]">Set an active season to browse coach dashboards.</p>
			{:else if teams.length === 0}
				<p class="text-sm text-[#8B949E]">No teams in the active season yet.</p>
			{:else}
				<ul class="space-y-3">
					{#each teams as team (team.id)}
						<li
							class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#2A3038] bg-[#161B22] p-5"
						>
							<div>
								<p class="text-lg font-bold">{team.name}</p>
								<p class="text-sm text-[#8B949E]">
									{currentSeason.name} · {team.divisionName} · {team.playerCount}
									{team.playerCount === 1 ? 'player' : 'players'}
								</p>
							</div>
							<a
								href={resolve('/dashboard/[orgSlug]/portal/[teamId]', {
									orgSlug: params.orgSlug,
									teamId: team.id,
								})}
								class="inline-flex items-center rounded-md bg-[#58A6FF] px-3 py-2 text-sm font-semibold text-[#0D1117]"
							>
								Open Team
							</a>
						</li>
					{/each}
				</ul>
			{/if}
		{:else if orgAssignments.length === 0}
			<p class="text-sm text-[#8B949E]">You don't have any active team assignments in this league.</p>
		{:else}
			<ul class="space-y-3">
				{#each orgAssignments as assignment (assignment.id)}
					<li
						class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#2A3038] bg-[#161B22] p-5"
					>
						<div>
							<p class="text-lg font-bold">{assignment.team?.name ?? 'Team'}</p>
							<p class="text-sm text-[#8B949E]">
								{assignment.team?.division?.season?.name ?? 'Season'} ·
								{coachRoleLabels[assignment.assignmentRole]}
							</p>
						</div>
						<a
							href={resolve('/dashboard/[orgSlug]/portal/[teamId]', {
								orgSlug: params.orgSlug,
								teamId: assignment.teamId,
							})}
							class="inline-flex items-center rounded-md bg-[#58A6FF] px-3 py-2 text-sm font-semibold text-[#0D1117]"
						>
							Open Team
						</a>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</div>
