<script lang="ts">
	import { requireAdmin } from '$lib/api/auth.remote';
	import { getUserCount } from '$lib/api/user.remote';
	import type { Organization } from '$lib/server/db/auth-schema';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import InfoIcon from '@lucide/svelte/icons/info';
	import SubmitButton from '$lib/components/SubmitButton.svelte';
	import { createLeague } from '$lib/api/league.remote';
	import * as Field from '$lib/components/ui/field/index.js';
	import NameSlugFields from '$lib/forms/NameSlugFields.svelte';
	import { leagueFormLabels } from '$lib/forms/labels';
	import ErrorAlert from '$lib/components/ErrorAlert.svelte';
	import LeagueLogoForm from '$lib/forms/LeagueLogoForm.svelte';
	import {
		enterLeagueAsAdmin,
		getHomepageLeague,
		listAllLeaguesForAdmin,
	} from '$lib/api/organization.remote';
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';

	let { org }: { org: Organization } = $props();
	await requireAdmin();

	const submitting = $derived(!!createLeague.pending);
	const homepageLeague = $derived(await getHomepageLeague());
	const leagues = $derived(await listAllLeaguesForAdmin());
	let openingId = $state<string | null>(null);

	async function openLeague(
		leagueId: string,
		destination: 'dashboard' | 'stats'
	) {
		openingId = `${leagueId}:${destination}`;
		try {
			const result = await enterLeagueAsAdmin({ organizationId: leagueId, destination });
			if (destination === 'stats' && result.seasonSlug) {
				await goto(
					resolve('/dashboard/[orgSlug]/seasons/[seasonSlug]/stats', {
						orgSlug: result.slug,
						seasonSlug: result.seasonSlug,
					})
				);
				return;
			}
			await goto(resolve('/dashboard/[orgSlug]', { orgSlug: result.slug }));
		} finally {
			openingId = null;
		}
	}
</script>

<div class="m-6 flex flex-col gap-8 text-[#E6EDF3]">
	<h1 class="text-2xl font-bold">{org.name} Overview</h1>

	<section>
		<h2 class="text-xl font-semibold">Metrics</h2>
		<p class="mt-1 text-sm text-[#8B949E]">Number of users: {await getUserCount()}</p>
	</section>

	<section class="space-y-3">
		<div class="flex flex-wrap items-end justify-between gap-3">
			<div>
				<h2 class="text-xl font-semibold">Leagues</h2>
				<p class="mt-1 text-sm text-[#8B949E]">
					Open a league dashboard or jump straight to its stats.
				</p>
			</div>
			<a
				href={resolve('/dashboard/[orgSlug]/invites', { orgSlug: org.slug })}
				class="rounded-md bg-[#58A6FF] px-3 py-2 text-sm font-semibold text-[#0D1117]"
			>
				Invite coaches & players
			</a>
		</div>

		{#if leagues.length === 0}
			<p class="rounded-xl border border-[#2A3038] bg-[#161B22] p-4 text-sm text-[#8B949E]">
				No leagues yet. Create one below.
			</p>
		{:else}
			<div class="overflow-hidden rounded-2xl border border-[#2A3038] bg-[#161B22]">
				<table class="w-full text-left text-sm">
					<thead class="border-b border-[#2A3038] text-xs tracking-wide text-[#8B949E] uppercase">
						<tr>
							<th class="px-4 py-3 font-semibold">League</th>
							<th class="hidden px-4 py-3 font-semibold sm:table-cell">Season</th>
							<th class="hidden px-4 py-3 font-semibold md:table-cell">Teams</th>
							<th class="hidden px-4 py-3 font-semibold md:table-cell">Players</th>
							<th class="hidden px-4 py-3 font-semibold lg:table-cell">Games</th>
							<th class="px-4 py-3 font-semibold">Open</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-[#2A3038]">
						{#each leagues as league (league.id)}
							<tr class="hover:bg-[#1C2128]">
								<td class="px-4 py-3">
									<button
										type="button"
										class="font-medium text-[#58A6FF] hover:underline disabled:opacity-60"
										disabled={openingId !== null}
										onclick={() => openLeague(league.id, 'dashboard')}
									>
										{league.name}
									</button>
								</td>
								<td class="hidden px-4 py-3 text-[#8B949E] sm:table-cell">
									{league.season?.name ?? '—'}
								</td>
								<td class="hidden px-4 py-3 tabular-nums md:table-cell">{league.stats.teams}</td>
								<td class="hidden px-4 py-3 tabular-nums md:table-cell">
									{league.stats.players}
								</td>
								<td class="hidden px-4 py-3 tabular-nums lg:table-cell">{league.stats.games}</td>
								<td class="px-4 py-3">
									<div class="flex flex-wrap gap-3">
										<button
											type="button"
											class="text-[#58A6FF] hover:underline disabled:opacity-60"
											disabled={openingId !== null}
											onclick={() => openLeague(league.id, 'dashboard')}
										>
											{openingId === `${league.id}:dashboard` ? 'Opening…' : 'Dashboard'}
										</button>
										<button
											type="button"
											class="text-[#8B949E] hover:text-[#E6EDF3] disabled:opacity-60"
											disabled={openingId !== null || !league.season}
											onclick={() => openLeague(league.id, 'stats')}
										>
											{openingId === `${league.id}:stats` ? 'Opening…' : 'Stats'}
										</button>
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</section>

	{#if homepageLeague}
		<section class="max-w-xl">
			<LeagueLogoForm league={homepageLeague} />
		</section>
	{/if}

	<section class="max-w-xl">
		<Card.Root>
			<Card.Header>
				<Card.Title class="text-center text-xl">Create a League</Card.Title>
				<Card.Description class="space-y-3">
					Manage seasons and divisions from the league dashboard, and import stats once they're set
					up.
				</Card.Description>
			</Card.Header>
			<form class="contents" {...createLeague}>
				<Card.Content>
					<Field.Set disabled={submitting}>
						<Field.Group>
							<NameSlugFields
								labels={leagueFormLabels}
								remoteFields={{ name: createLeague.fields.name, slug: createLeague.fields.slug }}
								required
							/>
							<ErrorAlert errors={createLeague.fields.issues()} />
						</Field.Group>
					</Field.Set>
				</Card.Content>
				<Card.Footer class="flex flex-col gap-4">
					<Alert.Root>
						<InfoIcon class="size-6 stroke-info" />
						<Alert.Title>You will be redirected</Alert.Title>
						<Alert.Description>
							After creating the league, you'll be redirected to its dashboard. You can return to
							the admin org by selecting it from the top-left sidebar.
						</Alert.Description>
					</Alert.Root>

					<SubmitButton {submitting} class="w-full sm:w-4/5">Create League</SubmitButton>
				</Card.Footer>
			</form>
		</Card.Root>
	</section>
</div>
