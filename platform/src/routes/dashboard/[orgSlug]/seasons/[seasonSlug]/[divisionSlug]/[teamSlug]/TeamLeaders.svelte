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

	const formatValue = (value: number) =>
		value.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

	const initialsFor = (name: string) =>
		name
			.trim()
			.split(/\s+/)
			.slice(0, 2)
			.map((part) => part[0]?.toUpperCase() ?? '')
			.join('');
</script>

<section class="w-full">
	<h2 class="mb-3 text-xl font-bold text-foreground">Team Leaders</h2>

	{#if leaders.every((leader) => !leader.player)}
		<p class="text-muted-foreground text-sm">No game stats yet — import a spreadsheet to see leaders.</p>
	{:else}
		<div class="overflow-x-auto rounded-md border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-card">
			<div class="grid min-w-[52rem] grid-cols-5 divide-x divide-neutral-200 dark:divide-neutral-700">
				{#each leaders as leader (leader.key)}
					<div class="p-4">
						<p class="mb-3 text-sm text-neutral-700 dark:text-neutral-300">{leader.label}</p>

						{#if leader.player}
							{@const player = leader.player}
							<div class="flex items-start gap-3">
								<div
									class="flex size-11 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-xs font-bold text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200"
									aria-hidden="true"
								>
									{initialsFor(player.name)}
								</div>
								<div class="min-w-0">
									<p class="truncate text-sm leading-tight">
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
											class="font-semibold text-foreground hover:underline"
										>
											{player.name}
										</a>
										{#if player.jerseyNumber}
											<span class="ml-1 text-neutral-500">#{player.jerseyNumber}</span>
										{/if}
									</p>
									<p class="mt-1 text-3xl font-extrabold tracking-tight text-foreground">
										{formatValue(player.value)}
									</p>
								</div>
							</div>
						{:else}
							<p class="text-sm text-neutral-500">—</p>
						{/if}
					</div>
				{/each}
			</div>
		</div>
	{/if}
</section>
