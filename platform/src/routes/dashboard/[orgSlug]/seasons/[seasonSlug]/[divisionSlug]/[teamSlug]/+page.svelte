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
	import RosterPlayerRow from './RosterPlayerRow.svelte';

	let { params }: PageProps = $props();

	const org = $derived(await getOrganization({ slug: params.orgSlug }));
	const season = $derived(await getSeason({ slug: params.seasonSlug, organizationId: org.id }));
	const division = $derived(await getDivision({ slug: params.divisionSlug, seasonId: season.id }));
	const team = $derived(
		await getTeam({ slug: params.teamSlug, divisionId: division.id, include: { players: true } })
	);

	const tabs = ['Home', 'Stats', 'Schedule', 'Roster', 'Depth', 'Injuries'] as const;
	type Tab = (typeof tabs)[number];
	let activeTab = $state<Tab>('Roster');
	let following = $state(false);

	const nameParts = $derived(team.name.trim().split(/\s+/));
	const primaryName = $derived(nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : '');
	const accentName = $derived(nameParts.length > 1 ? nameParts.at(-1)! : team.name);
	const initials = $derived(
		nameParts
			.slice(0, 2)
			.map((part) => part[0]?.toUpperCase() ?? '')
			.join('')
	);
</script>

<svelte:head>
	<title>{team.name} | {PUBLIC_APP_NAME}</title>
</svelte:head>

<div class="bg-background min-h-full">
	<header class="border-b border-border bg-card px-4 pt-6 sm:px-8">
		<div class="flex items-start gap-4 sm:gap-5">
			<div
				class="flex size-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-red-600 to-orange-500 text-xl font-black tracking-tight text-white shadow-sm sm:size-20 sm:text-2xl"
				aria-hidden="true"
			>
				{initials || 'T'}
			</div>

			<div class="min-w-0 flex-1">
				<h1 class="text-3xl leading-none tracking-tight uppercase sm:text-4xl">
					{#if primaryName}
						<span class="font-medium text-neutral-500">{primaryName}</span>
						{' '}
					{/if}
					<span class="font-extrabold text-foreground">{accentName}</span>
				</h1>

				<div class="mt-4 flex flex-wrap items-center gap-3">
					<button
						type="button"
						class="rounded-full px-5 py-1.5 text-sm font-bold text-white transition-colors {following
							? 'bg-neutral-700 hover:bg-neutral-800'
							: 'bg-[#1a73e8] hover:bg-[#1558b0]'}"
						onclick={() => (following = !following)}
					>
						{following ? 'Following' : 'Follow'}
					</button>
					<p class="text-sm text-neutral-600 dark:text-neutral-400">
						In {division.name} · {season.name}
					</p>
				</div>
			</div>
		</div>

		<nav class="mt-6 -mb-px flex gap-6 overflow-x-auto" aria-label="Team sections">
			{#each tabs as tab (tab)}
				<button
					type="button"
					class="shrink-0 border-b-[3px] pb-3 text-sm font-medium transition-colors {activeTab ===
					tab
						? 'border-[#ce1126] text-foreground'
						: 'border-transparent text-neutral-600 hover:text-foreground dark:text-neutral-400'}"
					onclick={() => (activeTab = tab)}
				>
					{tab}
				</button>
			{/each}
		</nav>
	</header>

	<div class="px-4 py-8 sm:px-8">
		{#if activeTab === 'Roster'}
			<section class="mx-auto w-full max-w-3xl">
				<h2 class="mb-4 text-xl font-bold">Roster</h2>
				{#if team.players.length === 0}
					<p class="text-muted-foreground">No players on this roster yet.</p>
				{:else}
					<Table.Root class="w-full">
						<Table.Header>
							<Table.Row>
								<Table.Head>Player Name</Table.Head>
								<Table.Head class="w-24 text-center">Jersey #</Table.Head>
								<Table.Head class="hidden w-28 text-center sm:table-cell">Games Played</Table.Head>
								<Table.Head class="w-24 text-end">Edit</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each team.players as player (player.id)}
								<RosterPlayerRow
									{player}
									teamSlug={team.slug}
									divisionId={division.id}
									playerHref={resolve(
										'/dashboard/[orgSlug]/seasons/[seasonSlug]/[divisionSlug]/[teamSlug]/[jerseyNumber]',
										{
											...params,
											teamSlug: team.slug,
											jerseyNumber: player.jerseyNumber ?? '',
										}
									)}
								/>
							{/each}
						</Table.Body>
					</Table.Root>
				{/if}
			</section>
		{:else if activeTab === 'Home'}
			<section class="mx-auto max-w-3xl space-y-2">
				<h2 class="text-xl font-bold">Home</h2>
				<p class="text-muted-foreground">
					Team overview for {team.name}. Roster has {team.players.length} players in {division.name}.
				</p>
			</section>
		{:else if activeTab === 'Stats'}
			<section class="mx-auto w-full max-w-6xl">
				<TeamLeaders teamId={team.id} teamSlug={team.slug} />
			</section>
		{:else if activeTab === 'Schedule'}
			<section class="mx-auto max-w-3xl space-y-2">
				<h2 class="text-xl font-bold">Schedule</h2>
				<p class="text-muted-foreground">Game schedule coming soon (localhost test placeholder).</p>
			</section>
		{:else if activeTab === 'Depth'}
			<section class="mx-auto max-w-3xl space-y-2">
				<h2 class="text-xl font-bold">Depth Chart</h2>
				<p class="text-muted-foreground">Depth chart coming soon (localhost test placeholder).</p>
			</section>
		{:else}
			<section class="mx-auto max-w-3xl space-y-2">
				<h2 class="text-xl font-bold">Injuries</h2>
				<p class="text-muted-foreground">No injury report yet (localhost test placeholder).</p>
			</section>
		{/if}
	</div>
</div>
