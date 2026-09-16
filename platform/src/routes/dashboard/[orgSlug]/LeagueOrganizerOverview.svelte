<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import {
		getCurrentSeason,
		getLeagueRecentActivity,
		getSeasonStats,
		getSeasons,
		setActiveSeason,
	} from '$lib/api/season.remote';
	import { listLeagueCoaches } from '$lib/api/coach.remote';
	import type { Organization } from '$lib/server/db/auth-schema';
	import AnimatedNumber from '$lib/components/AnimatedNumber.svelte';

	let { org }: { org: Organization } = $props();

	const orgSlug = $derived(page.params.orgSlug!);
	const currentSeason = $derived(await getCurrentSeason({ organizationId: org.id }));
	const seasons = $derived(await getSeasons({ organizationId: org.id }));
	const seasonStats = $derived(
		currentSeason ? await getSeasonStats({ seasonId: currentSeason.id }) : null
	);
	const coaches = $derived(
		currentSeason
			? await listLeagueCoaches({ organizationId: org.id, seasonId: currentSeason.id })
			: []
	);
	const activity = $derived(await getLeagueRecentActivity({ organizationId: org.id, limit: 8 }));

	const suggestedSeason = $derived(
		[...seasons].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] ?? null
	);

	let settingActive = $state(false);

	const numberFormatter = new Intl.NumberFormat('en', {
		style: 'decimal',
		maximumFractionDigits: 0,
	});
	const format = (n: number) => numberFormatter.format(n);

	const formatActivityDate = (date: Date) =>
		date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

	const statsHref = $derived(
		currentSeason
			? resolve('/dashboard/[orgSlug]/seasons/[seasonSlug]/stats', {
					orgSlug,
					seasonSlug: currentSeason.slug,
				})
			: null
	);

	const seasonManageHref = $derived(
		currentSeason
			? resolve('/dashboard/[orgSlug]/seasons/[seasonSlug]', {
					orgSlug,
					seasonSlug: currentSeason.slug,
				})
			: resolve('/dashboard/[orgSlug]/seasons', { orgSlug })
	);

	const importHref = $derived(resolve('/dashboard/[orgSlug]/import', { orgSlug }));
	const teamsHref = $derived(resolve('/dashboard/[orgSlug]/teams', { orgSlug }));
	const playersHref = $derived(resolve('/dashboard/[orgSlug]/players', { orgSlug }));
	const gamesHref = $derived(resolve('/dashboard/[orgSlug]/games', { orgSlug }));
	const coachesHref = $derived(resolve('/dashboard/[orgSlug]/coaches', { orgSlug }));
	const seasonsHref = $derived(resolve('/dashboard/[orgSlug]/seasons', { orgSlug }));

	const invitedCoaches = $derived(coaches.filter((c) => c.status === 'invited').length);

	const actionItems = $derived.by(() => {
		if (!seasonStats) return [] as Array<{ label: string; href: string; count: number }>;
		const items: Array<{ label: string; href: string; count: number }> = [];
		if (seasonStats.missingStatsCount > 0) {
			items.push({
				count: seasonStats.missingStatsCount,
				label:
					seasonStats.missingStatsCount === 1
						? 'game missing stats'
						: 'games missing stats',
				href: gamesHref,
			});
		}
		if (seasonStats.awaitingReviewCount > 0) {
			items.push({
				count: seasonStats.awaitingReviewCount,
				label:
					seasonStats.awaitingReviewCount === 1
						? 'game awaiting stats review'
						: 'games awaiting stats review',
				href: gamesHref,
			});
		}
		if (invitedCoaches > 0) {
			items.push({
				count: invitedCoaches,
				label:
					invitedCoaches === 1
						? 'coach invitation still pending'
						: 'coach invitations still pending',
				href: coachesHref,
			});
		}
		return items;
	});

	async function activateSeason(seasonId: string) {
		settingActive = true;
		try {
			await setActiveSeason({ seasonId, organizationId: org.id });
			await Promise.all([
				getCurrentSeason({ organizationId: org.id }).refresh(),
				getSeasons({ organizationId: org.id }).refresh(),
			]);
		} finally {
			settingActive = false;
		}
	}

	const overviewMetrics = $derived(
		seasonStats
			? [
					{ label: 'Players', value: seasonStats.playerCount, href: playersHref },
					{ label: 'Teams', value: seasonStats.teamCount, href: teamsHref },
					{ label: 'Divisions', value: seasonStats.divisionCount, href: seasonManageHref },
					{ label: 'Games', value: seasonStats.gameCount, href: gamesHref },
				]
			: []
	);

	const leagueManagement = $derived([
		{ label: 'Seasons', href: seasonsHref, hint: 'Create and activate seasons' },
		{ label: 'Divisions & teams', href: seasonManageHref, hint: 'Structure the league' },
		{ label: 'Teams', href: teamsHref, hint: 'All teams this season' },
		{ label: 'Coaches', href: coachesHref, hint: 'Invite and manage access' },
		{ label: 'Players', href: playersHref, hint: 'League-wide roster' },
		{ label: 'Games', href: gamesHref, hint: 'Schedule and results' },
	]);

	const gameManagement = $derived([
		{ label: 'View / manage games', href: gamesHref, hint: 'Scores, status, results' },
		{ label: 'Import game stats', href: importHref, hint: 'Spreadsheet upload' },
		{
			label: 'Review missing stats',
			href: gamesHref,
			hint: seasonStats
				? `${format(seasonStats.missingStatsCount)} need attention`
				: 'Check completed games',
		},
	]);

	const statsManagement = $derived([
		{
			label: 'League stats website',
			href: statsHref ?? seasonManageHref,
			hint: 'Standings, leaders, results',
		},
		{ label: 'Import / correct stats', href: importHref, hint: 'Bulk update from sheets' },
		{ label: 'Team & player pages', href: teamsHref, hint: 'Drill into any team' },
	]);
</script>

<div class="min-h-full bg-[#0D1117] text-[#E6EDF3]">
	<div class="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-6">
		<header>
			<p class="text-xs font-semibold tracking-wide text-[#58A6FF] uppercase">Admin Portal</p>
			<h1 class="mt-1 text-2xl font-extrabold tracking-tight uppercase sm:text-3xl">{org.name}</h1>
			<p class="mt-1 text-sm text-[#8B949E]">
				How is the whole league running? Operations, oversight, and season performance.
			</p>
		</header>

		{#if currentSeason && seasonStats}
			<section class="rounded-2xl border border-[#2A3038] bg-[#161B22] p-5 sm:p-6">
				<p class="text-xs font-semibold tracking-wide text-[#8B949E] uppercase">League Overview</p>
				<h2 class="mt-1 text-xl font-bold">{currentSeason.name}</h2>

				<div class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
					{#each overviewMetrics as metric (metric.label)}
						<a
							href={metric.href}
							class="rounded-xl border border-[#2A3038] bg-[#0D1117] p-4 transition-colors hover:border-[#58A6FF]"
						>
							<p class="text-xs font-medium tracking-wide text-[#8B949E] uppercase">
								{metric.label}
							</p>
							<p class="mt-2 text-2xl font-bold tabular-nums">
								<AnimatedNumber end={metric.value} {format} />
							</p>
						</a>
					{/each}
				</div>

				<div class="mt-4 grid gap-3 sm:grid-cols-2">
					<div class="rounded-xl border border-[#2A3038] bg-[#0D1117] p-4">
						<div class="flex items-center justify-between text-sm">
							<span class="text-[#8B949E]">Games completed</span>
							<span class="font-semibold tabular-nums">{seasonStats.gamesCompletedPct}%</span>
						</div>
						<div class="mt-2 h-2 overflow-hidden rounded-full bg-[#2A3038]">
							<div
								class="h-full rounded-full bg-[#58A6FF]"
								style={`width: ${seasonStats.gamesCompletedPct}%`}
							></div>
						</div>
						<p class="mt-2 text-xs text-[#8B949E]">
							{format(seasonStats.completedCount)} of {format(seasonStats.gameCount)} games
						</p>
					</div>
					<div class="rounded-xl border border-[#2A3038] bg-[#0D1117] p-4">
						<div class="flex items-center justify-between text-sm">
							<span class="text-[#8B949E]">Stats submitted</span>
							<span class="font-semibold tabular-nums">{seasonStats.statsSubmittedPct}%</span>
						</div>
						<div class="mt-2 h-2 overflow-hidden rounded-full bg-[#2A3038]">
							<div
								class="h-full rounded-full bg-[#3FB950]"
								style={`width: ${seasonStats.statsSubmittedPct}%`}
							></div>
						</div>
						<p class="mt-2 text-xs text-[#8B949E]">
							{format(seasonStats.statsSubmittedCount)} of {format(seasonStats.completedCount)} completed
							games
						</p>
					</div>
				</div>

				<div class="mt-4 flex flex-wrap gap-2">
					{#if statsHref}
						<a
							href={statsHref}
							class="inline-flex items-center rounded-md bg-[#58A6FF] px-3 py-2 text-sm font-semibold text-[#0D1117] hover:bg-[#58A6FF]/90"
						>
							Open Stats Website
						</a>
					{/if}
					<a
						href={importHref}
						class="inline-flex items-center rounded-md border border-[#2A3038] bg-[#0D1117] px-3 py-2 text-sm font-medium hover:border-[#58A6FF]"
					>
						Import Stats
					</a>
					<a
						href={seasonManageHref}
						class="inline-flex items-center rounded-md border border-[#2A3038] bg-[#0D1117] px-3 py-2 text-sm font-medium hover:border-[#58A6FF]"
					>
						Manage Season
					</a>
				</div>
			</section>
		{:else if suggestedSeason}
			<section class="rounded-2xl border border-[#F0A020]/40 bg-[#161B22] p-5 sm:p-6">
				<p class="text-xs font-semibold tracking-wide text-[#F0A020] uppercase">No active season</p>
				<p class="mt-2 text-base text-[#E6EDF3]">
					{suggestedSeason.name} exists but is not currently active.
				</p>
				<button
					type="button"
					class="mt-4 inline-flex items-center rounded-md bg-[#F0A020] px-3 py-2 text-sm font-semibold text-[#0D1117] disabled:opacity-60"
					disabled={settingActive}
					onclick={() => activateSeason(suggestedSeason.id)}
				>
					{settingActive ? 'Setting…' : `Set ${suggestedSeason.name} as Active`}
				</button>
			</section>
		{:else}
			<section class="rounded-2xl border border-[#2A3038] bg-[#161B22] p-5 sm:p-6">
				<p class="text-base text-[#E6EDF3]">No seasons yet.</p>
				<a
					href={seasonsHref}
					class="mt-4 inline-flex items-center rounded-md bg-[#58A6FF] px-3 py-2 text-sm font-semibold text-[#0D1117]"
				>
					Create a season
				</a>
			</section>
		{/if}

		{#if actionItems.length > 0}
			<section class="rounded-2xl border border-[#F0A020]/40 bg-[#161B22] p-5 sm:p-6">
				<h2 class="text-sm font-semibold tracking-wide text-[#F0A020] uppercase">Action Required</h2>
				<ul class="mt-4 space-y-2">
					{#each actionItems as item (item.label)}
						<li>
							<a
								href={item.href}
								class="flex items-center justify-between rounded-xl border border-[#2A3038] bg-[#0D1117] px-4 py-3 text-sm transition-colors hover:border-[#F0A020]"
							>
								<span>
									<span class="font-bold tabular-nums text-[#F0A020]">{item.count}</span>
									{item.label}
								</span>
								<span class="text-[#58A6FF]">Review →</span>
							</a>
						</li>
					{/each}
				</ul>
			</section>
		{/if}

		<section class="rounded-2xl border border-[#2A3038] bg-[#161B22] p-5 sm:p-6">
			<h2 class="text-sm font-semibold tracking-wide text-[#8B949E] uppercase">League Management</h2>
			<p class="mt-1 text-sm text-[#8B949E]">Seasons, structure, people, and access.</p>
			<div class="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
				{#each leagueManagement as item (item.label)}
					<a
						href={item.href}
						class="rounded-xl border border-[#2A3038] bg-[#0D1117] px-3 py-3 hover:border-[#58A6FF]"
					>
						<p class="text-sm font-medium">{item.label}</p>
						<p class="mt-1 text-xs text-[#8B949E]">{item.hint}</p>
					</a>
				{/each}
			</div>
		</section>

		<section class="rounded-2xl border border-[#2A3038] bg-[#161B22] p-5 sm:p-6">
			<h2 class="text-sm font-semibold tracking-wide text-[#8B949E] uppercase">Game Management</h2>
			<p class="mt-1 text-sm text-[#8B949E]">Schedule, scores, and submissions.</p>
			<div class="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
				{#each gameManagement as item (item.label)}
					<a
						href={item.href}
						class="rounded-xl border border-[#2A3038] bg-[#0D1117] px-3 py-3 hover:border-[#58A6FF]"
					>
						<p class="text-sm font-medium">{item.label}</p>
						<p class="mt-1 text-xs text-[#8B949E]">{item.hint}</p>
					</a>
				{/each}
			</div>
		</section>

		<section class="rounded-2xl border border-[#2A3038] bg-[#161B22] p-5 sm:p-6">
			<h2 class="text-sm font-semibold tracking-wide text-[#8B949E] uppercase">Stats & Reports</h2>
			<p class="mt-1 text-sm text-[#8B949E]">League-wide performance and analytics.</p>
			<div class="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
				{#each statsManagement as item (item.label)}
					<a
						href={item.href}
						class="rounded-xl border border-[#2A3038] bg-[#0D1117] px-3 py-3 hover:border-[#58A6FF]"
					>
						<p class="text-sm font-medium">{item.label}</p>
						<p class="mt-1 text-xs text-[#8B949E]">{item.hint}</p>
					</a>
				{/each}
			</div>
		</section>

		<section class="rounded-2xl border border-[#2A3038] bg-[#161B22] p-5 sm:p-6">
			<h2 class="text-sm font-semibold tracking-wide text-[#8B949E] uppercase">Recent Activity</h2>
			{#if activity.length === 0}
				<p class="mt-3 text-sm text-[#8B949E]">No recent activity yet.</p>
			{:else}
				<ul class="mt-3 space-y-3">
					{#each activity as item (item.id)}
						<li class="flex items-start gap-3 text-sm">
							<span class="w-14 shrink-0 text-[#8B949E]">{formatActivityDate(item.at)}</span>
							<span class="text-[#E6EDF3]">{item.label}</span>
						</li>
					{/each}
				</ul>
			{/if}
		</section>
	</div>
</div>
