<script lang="ts">
	import { PUBLIC_APP_NAME } from '$env/static/public';
	import { resolve } from '$app/paths';
	import { getOrganization } from '$lib/api/organization.remote';
	import { getCurrentSeason, getSeasons } from '$lib/api/season.remote';
	import { getSeasonTeams } from '$lib/api/league-manage.remote';
	import {
		cancelCoachInvite,
		inviteCoach,
		listLeagueCoaches,
		removeCoachAccess,
		resendCoachInvite,
	} from '$lib/api/coach.remote';
	import { coachAssignmentRoles, coachRoleLabels } from '$lib/schemas/coach';
	import ActiveSeasonGate from '../ActiveSeasonGate.svelte';
	import type { PageProps } from './$types';
	import { focusFirstError } from '$lib/forms/enhance';
	import ErrorAlert from '$lib/components/ErrorAlert.svelte';
	import * as Field from '$lib/components/ui/field';
	import { Input } from '$lib/components/ui/input';
	import SubmitButton from '$lib/components/SubmitButton.svelte';
	import ClipboardIcon from '@lucide/svelte/icons/clipboard';
	import CheckIcon from '@lucide/svelte/icons/check';

	let { params }: PageProps = $props();
	const org = $derived(await getOrganization({ slug: params.orgSlug }));

	const seasons = $derived(await getSeasons({ organizationId: org.id }));
	const currentSeason = $derived(await getCurrentSeason({ organizationId: org.id }));

	let selectedSeasonId = $state<string>('');
	const seasonId = $derived(selectedSeasonId || currentSeason?.id || seasons[0]?.id || '');

	$effect(() => {
		if (!selectedSeasonId && currentSeason?.id) {
			selectedSeasonId = currentSeason.id;
		}
	});

	const teams = $derived(seasonId ? await getSeasonTeams({ seasonId }) : []);
	const coaches = $derived(
		seasonId ? await listLeagueCoaches({ organizationId: org.id, seasonId }) : []
	);

	let lastInviteUrl = $state<string | null>(null);
	let copied = $state(false);
	let submitting = $derived(!!inviteCoach.pending);

	async function refreshCoaches() {
		if (!seasonId) return;
		await listLeagueCoaches({ organizationId: org.id, seasonId }).refresh();
	}

	async function copyUrl(url: string) {
		await navigator.clipboard.writeText(url);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}

	async function afterInvite() {
		await refreshCoaches();
		if (inviteCoach.result?.inviteUrl) {
			lastInviteUrl = inviteCoach.result.inviteUrl;
			return;
		}
		const latest = (await listLeagueCoaches({ organizationId: org.id, seasonId })).find(
			(c) => c.status === 'invited' && c.inviteUrl
		);
		if (latest?.inviteUrl) lastInviteUrl = latest.inviteUrl;
	}
</script>

<svelte:head>
	<title>Coaches | {org.name} | {PUBLIC_APP_NAME}</title>
</svelte:head>

<div class="min-h-full bg-[#0D1117] text-[#E6EDF3]">
	<div class="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-6">
		<header class="flex flex-wrap items-end justify-between gap-4">
			<div>
				<p class="text-xs font-semibold tracking-wide text-[#8B949E] uppercase">Manage</p>
				<h1 class="mt-1 text-2xl font-bold tracking-tight">Coaches</h1>
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
		</header>

		{#if !seasonId}
			<ActiveSeasonGate organizationId={org.id} orgSlug={params.orgSlug} />
		{:else}
			<section class="rounded-2xl border border-[#2A3038] bg-[#161B22] p-5 sm:p-6">
				<h2 class="text-sm font-semibold tracking-wide text-[#8B949E] uppercase">Invite Coach</h2>
				<p class="mt-1 text-sm text-[#8B949E]">
					Creates an invite link you can copy and share (WhatsApp, text, email). No email is sent
					from the app yet.
				</p>

				<form
					class="mt-4 space-y-3"
					{...inviteCoach.enhance(async ({ submit }) => {
						await submit();
						await afterInvite();
					})}
					{@attach focusFirstError({
						submitting,
						issues: inviteCoach.fields.allIssues(),
					})}
				>
					<Field.Set disabled={submitting}>
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
								<Field.Label>Assign Team</Field.Label>
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
							<SubmitButton {submitting}>Send Invitation</SubmitButton>
						</div>
					</Field.Set>
				</form>

				{#if lastInviteUrl}
					<div
						class="mt-4 flex flex-col gap-2 rounded-xl border border-[#58A6FF]/40 bg-[#0D1117] p-4 sm:flex-row sm:items-center"
					>
						<div class="min-w-0 flex-1">
							<p class="text-xs font-semibold tracking-wide text-[#58A6FF] uppercase">
								Invite link ready — share it with the coach
							</p>
							<p class="mt-1 truncate font-mono text-sm text-[#E6EDF3]">{lastInviteUrl}</p>
						</div>
						<button
							type="button"
							class="inline-flex items-center justify-center gap-2 rounded-md bg-[#58A6FF] px-3 py-2 text-sm font-semibold text-[#0D1117]"
							onclick={() => copyUrl(lastInviteUrl!)}
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
				<h2 class="text-sm font-semibold tracking-wide text-[#8B949E] uppercase">Coaches</h2>
				{#if coaches.length === 0}
					<p class="mt-3 text-sm text-[#8B949E]">No coaches invited for this season yet.</p>
				{:else}
					<div class="mt-4 overflow-x-auto">
						<table class="w-full min-w-[640px] text-left text-sm">
							<thead class="border-b border-[#2A3038] text-[#8B949E]">
								<tr>
									<th class="pb-2 font-medium">Name</th>
									<th class="pb-2 font-medium">Team</th>
									<th class="pb-2 font-medium">Role</th>
									<th class="pb-2 font-medium">Status</th>
									<th class="pb-2 font-medium">Actions</th>
								</tr>
							</thead>
							<tbody>
								{#each coaches as coach (coach.id)}
									{@const resendForm = resendCoachInvite.for(coach.id)}
									{@const cancelForm = cancelCoachInvite.for(coach.id)}
									{@const removeForm = removeCoachAccess.for(coach.id)}
									<tr class="border-b border-[#2A3038]/60">
										<td class="py-3">
											<div class="font-medium">{coach.name}</div>
											{#if coach.email}
												<div class="text-xs text-[#8B949E]">{coach.email}</div>
											{/if}
										</td>
										<td class="py-3">{coach.teamName}</td>
										<td class="py-3">{coachRoleLabels[coach.assignmentRole]}</td>
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
															await afterInvite();
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
												{:else if coach.status === 'active'}
													<form
														{...removeForm.enhance(async ({ submit }) => {
															await submit();
															await refreshCoaches();
														})}
													>
														<input {...removeForm.fields.id.as('hidden', coach.id)} />
														<button type="submit" class="text-[#F85149] hover:underline">
															Remove access
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
		{/if}
	</div>
</div>
