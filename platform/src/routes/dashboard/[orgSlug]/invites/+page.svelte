<script lang="ts">
	import { PUBLIC_APP_NAME } from '$env/static/public';
	import { resolve } from '$app/paths';
	import { requireAdmin } from '$lib/api/auth.remote';
	import { getOrganization, listAllLeaguesForAdmin } from '$lib/api/organization.remote';
	import { getCurrentSeason, getSeasons } from '$lib/api/season.remote';
	import { getSeasonPlayers, getSeasonTeams } from '$lib/api/league-manage.remote';
	import {
		inviteCoach,
		listLeagueCoaches,
		cancelCoachInvite,
		resendCoachInvite,
	} from '$lib/api/coach.remote';
	import { inviteFamily } from '$lib/api/family.remote';
	import { coachAssignmentRoles, coachRoleLabels } from '$lib/schemas/coach';
	import { familyRelationships } from '$lib/schemas/family';
	import { focusFirstError } from '$lib/forms/enhance';
	import ErrorAlert from '$lib/components/ErrorAlert.svelte';
	import * as Field from '$lib/components/ui/field';
	import { Input } from '$lib/components/ui/input';
	import SubmitButton from '$lib/components/SubmitButton.svelte';
	import ClipboardIcon from '@lucide/svelte/icons/clipboard';
	import CheckIcon from '@lucide/svelte/icons/check';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();

	await requireAdmin();

	const org = $derived(await getOrganization({ slug: params.orgSlug }));
	const leagues = $derived(await listAllLeaguesForAdmin());

	let selectedLeagueId = $state('');
	let selectedSeasonId = $state('');
	let inviteTab = $state<'coach' | 'family'>('coach');
	let lastCoachInviteUrl = $state<string | null>(null);
	let lastFamilyInviteUrl = $state<string | null>(null);
	let copied = $state(false);
	let leagueSynced = $state<string | null>(null);

	const selectedLeague = $derived(
		leagues.find((l) => l.id === selectedLeagueId) ?? leagues[0] ?? null
	);

	$effect(() => {
		if (!selectedLeagueId && leagues[0]?.id) {
			selectedLeagueId = leagues[0].id;
		}
	});

	const seasons = $derived(
		selectedLeague ? await getSeasons({ organizationId: selectedLeague.id }) : []
	);
	const currentSeason = $derived(
		selectedLeague ? await getCurrentSeason({ organizationId: selectedLeague.id }) : null
	);

	$effect(() => {
		const leagueId = selectedLeague?.id ?? null;
		if (!leagueId) return;
		if (leagueSynced !== leagueId) {
			leagueSynced = leagueId;
			selectedSeasonId = currentSeason?.id || seasons[0]?.id || '';
			return;
		}
		if (!selectedSeasonId && (currentSeason?.id || seasons[0]?.id)) {
			selectedSeasonId = currentSeason?.id || seasons[0]?.id || '';
		}
	});

	const seasonId = $derived(selectedSeasonId || currentSeason?.id || seasons[0]?.id || '');
	const teams = $derived(seasonId ? await getSeasonTeams({ seasonId }) : []);
	const players = $derived(seasonId ? await getSeasonPlayers({ seasonId }) : []);
	const coaches = $derived(
		selectedLeague && seasonId
			? await listLeagueCoaches({ organizationId: selectedLeague.id, seasonId })
			: []
	);

	const coachSubmitting = $derived(!!inviteCoach.pending);
	const familySubmitting = $derived(!!inviteFamily.pending);

	async function copyUrl(url: string) {
		await navigator.clipboard.writeText(url);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}

	async function refreshCoaches() {
		if (!selectedLeague || !seasonId) return;
		await listLeagueCoaches({ organizationId: selectedLeague.id, seasonId }).refresh();
	}

	const relationshipLabels: Record<(typeof familyRelationships)[number], string> = {
		parent: 'Parent',
		guardian: 'Guardian',
		relative: 'Relative',
		fan: 'Fan',
		other: 'Other',
	};
</script>

<svelte:head>
	<title>Invites | {org.name} | {PUBLIC_APP_NAME}</title>
</svelte:head>

<div class="min-h-full bg-[#0D1117] text-[#E6EDF3]">
	<div class="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-6">
		<header class="flex flex-wrap items-end justify-between gap-4">
			<div>
				<p class="text-xs font-semibold tracking-wide text-[#8B949E] uppercase">Admin</p>
				<h1 class="mt-1 text-2xl font-bold tracking-tight">Invite links</h1>
				<p class="mt-1 text-sm text-[#8B949E]">
					Generate copyable invite links for coaches and player families in any league.
				</p>
			</div>
			{#if leagues.length > 0}
				<label class="text-sm text-[#8B949E]">
					League
					<select
						class="ml-2 rounded-md border border-[#2A3038] bg-[#0D1117] px-2 py-1.5 text-[#E6EDF3]"
						bind:value={selectedLeagueId}
					>
						{#each leagues as league (league.id)}
							<option value={league.id}>{league.name}</option>
						{/each}
					</select>
				</label>
			{/if}
		</header>

		{#if !selectedLeague}
			<div class="rounded-2xl border border-[#2A3038] bg-[#161B22] p-6 text-center">
				<p class="text-sm text-[#8B949E]">Create a league first, then come back to send invites.</p>
				<a
					href={resolve('/dashboard/[orgSlug]', { orgSlug: params.orgSlug })}
					class="mt-4 inline-flex rounded-md bg-[#58A6FF] px-3 py-2 text-sm font-semibold text-[#0D1117]"
				>
					Back to overview
				</a>
			</div>
		{:else}
			<div class="flex flex-wrap items-center gap-3">
				<div class="inline-flex rounded-lg border border-[#2A3038] bg-[#161B22] p-1">
					<button
						type="button"
						class="rounded-md px-3 py-1.5 text-sm font-medium {inviteTab === 'coach'
							? 'bg-[#58A6FF] text-[#0D1117]'
							: 'text-[#8B949E] hover:text-[#E6EDF3]'}"
						onclick={() => (inviteTab = 'coach')}
					>
						Coaches
					</button>
					<button
						type="button"
						class="rounded-md px-3 py-1.5 text-sm font-medium {inviteTab === 'family'
							? 'bg-[#58A6FF] text-[#0D1117]'
							: 'text-[#8B949E] hover:text-[#E6EDF3]'}"
						onclick={() => (inviteTab = 'family')}
					>
						Players / family
					</button>
				</div>

				{#if seasons.length > 0}
					<label class="text-sm text-[#8B949E]">
						Season
						<select
							class="ml-2 rounded-md border border-[#2A3038] bg-[#0D1117] px-2 py-1.5 text-[#E6EDF3]"
							bind:value={selectedSeasonId}
						>
							{#each seasons as season (season.id)}
								<option value={season.id}>{season.name}</option>
							{/each}
						</select>
					</label>
				{/if}
			</div>

			{#if !seasonId}
				<p class="rounded-xl border border-[#2A3038] bg-[#161B22] p-4 text-sm text-[#8B949E]">
					This league has no seasons yet.
					<a
						href={resolve('/dashboard/[orgSlug]/seasons', { orgSlug: selectedLeague.slug })}
						class="text-[#58A6FF] hover:underline"
					>
						Create a season
					</a>
				</p>
			{:else if inviteTab === 'coach'}
				<section class="rounded-2xl border border-[#2A3038] bg-[#161B22] p-5 sm:p-6">
					<h2 class="text-sm font-semibold tracking-wide text-[#8B949E] uppercase">Invite coach</h2>
					<p class="mt-1 text-sm text-[#8B949E]">
						Creates a link you can copy and share. No email is sent from the app yet.
					</p>

					<form
						class="mt-4 space-y-3"
						{...inviteCoach.enhance(async ({ submit }) => {
							const ok = await submit();
							if (ok) {
								lastCoachInviteUrl = inviteCoach.result?.inviteUrl ?? null;
								await refreshCoaches();
							}
						})}
						{@attach focusFirstError({
							submitting: coachSubmitting,
							issues: inviteCoach.fields.allIssues(),
						})}
					>
						<Field.Set disabled={coachSubmitting}>
							<div class="grid gap-3 sm:grid-cols-2">
								<Field.Field>
									<Field.Label>Email address</Field.Label>
									<Input {...inviteCoach.fields.email.as('email')} placeholder="coach@email.com" />
								</Field.Field>
								<Field.Field>
									<Field.Label>Name (optional)</Field.Label>
									<Input {...inviteCoach.fields.name.as('text')} placeholder="John Smith" />
								</Field.Field>
								<Field.Field>
									<Field.Label>Assign team</Field.Label>
									<select
										class="w-full rounded-md border border-[#2A3038] bg-[#0D1117] px-3 py-2 text-sm"
										{...inviteCoach.fields.teamId.as('select')}
									>
										<option value="">Select a team</option>
										{#each teams as team (team.id)}
											<option value={team.id}>{team.name} · {team.divisionName}</option>
										{/each}
									</select>
								</Field.Field>
								<Field.Field>
									<Field.Label>Role</Field.Label>
									<select
										class="w-full rounded-md border border-[#2A3038] bg-[#0D1117] px-3 py-2 text-sm"
										{...inviteCoach.fields.assignmentRole.as('select', 'head_coach')}
									>
										{#each coachAssignmentRoles as role (role)}
											<option value={role}>{coachRoleLabels[role]}</option>
										{/each}
									</select>
								</Field.Field>
							</div>
							<ErrorAlert errors={inviteCoach.fields.issues()} />
							<div class="pt-2">
								<SubmitButton submitting={coachSubmitting}>Create coach invite</SubmitButton>
							</div>
						</Field.Set>
					</form>

					{#if lastCoachInviteUrl}
						<div
							class="mt-4 flex flex-col gap-2 rounded-xl border border-[#58A6FF]/40 bg-[#0D1117] p-4 sm:flex-row sm:items-center"
						>
							<div class="min-w-0 flex-1">
								<p class="text-xs font-semibold tracking-wide text-[#58A6FF] uppercase">
									Coach invite link ready
								</p>
								<p class="mt-1 truncate font-mono text-sm text-[#E6EDF3]">{lastCoachInviteUrl}</p>
							</div>
							<button
								type="button"
								class="inline-flex items-center justify-center gap-2 rounded-md bg-[#58A6FF] px-3 py-2 text-sm font-semibold text-[#0D1117]"
								onclick={() => copyUrl(lastCoachInviteUrl!)}
							>
								{#if copied}
									<CheckIcon class="size-4" /> Copied
								{:else}
									<ClipboardIcon class="size-4" /> Copy link
								{/if}
							</button>
						</div>
					{/if}
				</section>

				<section class="rounded-2xl border border-[#2A3038] bg-[#161B22] p-5 sm:p-6">
					<h2 class="text-sm font-semibold tracking-wide text-[#8B949E] uppercase">
						Pending & active coaches
					</h2>
					{#if coaches.length === 0}
						<p class="mt-3 text-sm text-[#8B949E]">No coaches invited for this season yet.</p>
					{:else}
						<div class="mt-4 overflow-x-auto">
							<table class="w-full min-w-[640px] text-left text-sm">
								<thead class="border-b border-[#2A3038] text-[#8B949E]">
									<tr>
										<th class="pb-2 font-medium">Name</th>
										<th class="pb-2 font-medium">Team</th>
										<th class="pb-2 font-medium">Status</th>
										<th class="pb-2 font-medium">Actions</th>
									</tr>
								</thead>
								<tbody>
									{#each coaches as coach (coach.id)}
										{@const resendForm = resendCoachInvite.for(coach.id)}
										{@const cancelForm = cancelCoachInvite.for(coach.id)}
										<tr class="border-b border-[#2A3038]/60">
											<td class="py-3">
												<div class="font-medium">{coach.name}</div>
												{#if coach.email}
													<div class="text-xs text-[#8B949E]">{coach.email}</div>
												{/if}
											</td>
											<td class="py-3">{coach.teamName}</td>
											<td class="py-3">{coach.statusLabel}</td>
											<td class="py-3">
												<div class="flex flex-wrap gap-3">
													{#if coach.status === 'invited' && coach.inviteUrl}
														<button
															type="button"
															class="text-[#58A6FF] hover:underline"
															onclick={() => copyUrl(coach.inviteUrl!)}
														>
															Copy link
														</button>
														<form
															{...resendForm.enhance(async ({ submit }) => {
																await submit();
																lastCoachInviteUrl = resendForm.result?.inviteUrl ?? lastCoachInviteUrl;
																await refreshCoaches();
															})}
														>
															<input {...resendForm.fields.id.as('hidden', coach.id)} />
															<button type="submit" class="text-[#8B949E] hover:text-[#E6EDF3]">
																Resend
															</button>
														</form>
														<form
															{...cancelForm.enhance(async ({ submit }) => {
																await submit();
																await refreshCoaches();
															})}
														>
															<input {...cancelForm.fields.id.as('hidden', coach.id)} />
															<button type="submit" class="text-[#F85149] hover:underline">
																Cancel
															</button>
														</form>
													{/if}
												</div>
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					{/if}
				</section>
			{:else}
				<section class="rounded-2xl border border-[#2A3038] bg-[#161B22] p-5 sm:p-6">
					<h2 class="text-sm font-semibold tracking-wide text-[#8B949E] uppercase">
						Invite player / family
					</h2>
					<p class="mt-1 text-sm text-[#8B949E]">
						Pick a player and email. Share the invite link so they can claim family access.
					</p>

					{#if players.length === 0}
						<p class="mt-4 text-sm text-[#8B949E]">
							No players in this season yet.
							<a
								href={resolve('/dashboard/[orgSlug]/import', { orgSlug: selectedLeague.slug })}
								class="text-[#58A6FF] hover:underline"
							>
								Import a spreadsheet
							</a>
						</p>
					{:else}
						<form
							class="mt-4 space-y-3"
							{...inviteFamily.enhance(async ({ submit }) => {
								const ok = await submit();
								if (ok) {
									lastFamilyInviteUrl = inviteFamily.result?.inviteUrl ?? null;
								}
							})}
							{@attach focusFirstError({
								submitting: familySubmitting,
								issues: inviteFamily.fields.allIssues(),
							})}
						>
							<Field.Set disabled={familySubmitting}>
								<div class="grid gap-3 sm:grid-cols-2">
									<Field.Field>
										<Field.Label>Player</Field.Label>
										<select
											class="w-full rounded-md border border-[#2A3038] bg-[#0D1117] px-3 py-2 text-sm"
											{...inviteFamily.fields.playerId.as('select')}
										>
											<option value="">Select a player</option>
											{#each players as player (player.id)}
												<option value={player.id}>
													#{player.jerseyNumber} {player.name} · {player.teamName}
												</option>
											{/each}
										</select>
									</Field.Field>
									<Field.Field>
										<Field.Label>Email address</Field.Label>
										<Input
											{...inviteFamily.fields.email.as('email')}
											placeholder="parent@email.com"
										/>
									</Field.Field>
									<Field.Field>
										<Field.Label>Relationship</Field.Label>
										<select
											class="w-full rounded-md border border-[#2A3038] bg-[#0D1117] px-3 py-2 text-sm"
											{...inviteFamily.fields.relationship.as('select', 'parent')}
										>
											{#each familyRelationships as rel (rel)}
												<option value={rel}>{relationshipLabels[rel]}</option>
											{/each}
										</select>
									</Field.Field>
									<Field.Field>
										<Field.Label>Name (optional)</Field.Label>
										<Input {...inviteFamily.fields.name.as('text')} placeholder="Alex Parent" />
									</Field.Field>
								</div>
								<ErrorAlert errors={inviteFamily.fields.issues()} />
								<div class="pt-2">
									<SubmitButton submitting={familySubmitting}>Create family invite</SubmitButton>
								</div>
							</Field.Set>
						</form>

						{#if lastFamilyInviteUrl}
							<div
								class="mt-4 flex flex-col gap-2 rounded-xl border border-[#58A6FF]/40 bg-[#0D1117] p-4 sm:flex-row sm:items-center"
							>
								<div class="min-w-0 flex-1">
									<p class="text-xs font-semibold tracking-wide text-[#58A6FF] uppercase">
										Family invite link ready
									</p>
									<p class="mt-1 truncate font-mono text-sm text-[#E6EDF3]">
										{lastFamilyInviteUrl}
									</p>
								</div>
								<button
									type="button"
									class="inline-flex items-center justify-center gap-2 rounded-md bg-[#58A6FF] px-3 py-2 text-sm font-semibold text-[#0D1117]"
									onclick={() => copyUrl(lastFamilyInviteUrl!)}
								>
									{#if copied}
										<CheckIcon class="size-4" /> Copied
									{:else}
										<ClipboardIcon class="size-4" /> Copy link
									{/if}
								</button>
							</div>
						{/if}
					{/if}
				</section>
			{/if}
		{/if}
	</div>
</div>
