<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { getOrganization } from '$lib/api/organization.remote';
	import { getTeam } from '$lib/api/team.remote';
	import { getCoachAssignmentForTeamQuery } from '$lib/api/coach-portal.remote';
	import { coachRoleLabels } from '$lib/schemas/coach';
	import type { LayoutProps } from './$types';
	import ExternalLinkIcon from '@lucide/svelte/icons/external-link';

	let { children, params }: LayoutProps = $props();

	const org = $derived(await getOrganization({ slug: params.orgSlug }));
	const assignment = $derived(await getCoachAssignmentForTeamQuery({ teamId: params.teamId }));
	const team = $derived(await getTeam({ id: params.teamId }));
	const season = $derived(assignment?.team?.division?.season);
	const division = $derived(assignment?.team?.division);

	const publicTeamHref = $derived(
		season && division
			? resolve('/dashboard/[orgSlug]/seasons/[seasonSlug]/[divisionSlug]/[teamSlug]', {
					orgSlug: params.orgSlug,
					seasonSlug: season.slug,
					divisionSlug: division.slug,
					teamSlug: team.slug,
				})
			: null
	);

	const base = $derived(
		resolve('/dashboard/[orgSlug]/portal/[teamId]', {
			orgSlug: params.orgSlug,
			teamId: params.teamId,
		})
	);

	const nav = $derived([
		{ label: 'Overview', href: base, match: 'exact' as const },
		{ label: 'Roster', href: `${base}/roster`, match: 'exact' as const },
		{ label: 'Games', href: `${base}/games`, match: 'exact' as const },
		{ label: 'Player Stats', href: `${base}/player-stats`, match: 'prefix' as const },
		{ label: 'Team Stats', href: `${base}/team-stats`, match: 'exact' as const },
	]);

	const path = $derived(page.url.pathname.replace(/\/$/, '') || '/');

	function isActive(href: string, match: 'exact' | 'prefix') {
		const normalized = href.replace(/\/$/, '');
		return match === 'prefix' ? path === normalized || path.startsWith(`${normalized}/`) : path === normalized;
	}
</script>

<div class="min-h-full bg-[#0D1117] text-[#E6EDF3]">
	<div class="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-6">
		<header class="space-y-1">
			<p class="text-xs font-semibold tracking-wide text-[#8B949E] uppercase">{org.name}</p>
			<p class="text-xs font-semibold tracking-wide text-[#58A6FF] uppercase">Coach Portal</p>
			<h1 class="text-2xl font-bold tracking-tight sm:text-3xl">{team.name}</h1>
			<p class="text-sm text-[#8B949E]">
				How is my team doing? {season?.name ?? 'Season'} · {assignment
					? coachRoleLabels[assignment.assignmentRole]
					: 'Coach'} · Read-only for now
			</p>
			{#if publicTeamHref}
				<a
					href={publicTeamHref}
					class="mt-2 inline-flex items-center gap-1.5 text-sm text-[#58A6FF] hover:underline"
				>
					View Public Team Page
					<ExternalLinkIcon class="size-3.5" />
				</a>
			{/if}
		</header>

		<nav class="flex gap-5 overflow-x-auto border-b border-[#2A3038]" aria-label="Coach portal">
			{#each nav as item (item.label)}
				{@const active = isActive(item.href, item.match)}
				<a
					href={item.href}
					class="shrink-0 border-b-2 pb-3 text-sm font-medium transition-colors {active
						? 'border-[#58A6FF] text-[#58A6FF]'
						: 'border-transparent text-[#8B949E] hover:text-[#E6EDF3]'}"
				>
					{item.label}
				</a>
			{/each}
		</nav>

		{@render children()}
	</div>
</div>
