<script lang="ts">
	import { PUBLIC_APP_NAME } from '$env/static/public';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { getOrganization } from '$lib/api/organization.remote';
	import { getCurrentSeason } from '$lib/api/season.remote';
	import { getSeasonPlayers } from '$lib/api/league-manage.remote';
	import { inviteFamily } from '$lib/api/family.remote';
	import { familyRelationships } from '$lib/schemas/family';
	import ActiveSeasonGate from '../ActiveSeasonGate.svelte';
	import type { PageProps } from './$types';
	import { redirect } from '@sveltejs/kit';
	import ClipboardIcon from '@lucide/svelte/icons/clipboard';
	import CheckIcon from '@lucide/svelte/icons/check';
	import { focusFirstError } from '$lib/forms/enhance';
	import ErrorAlert from '$lib/components/ErrorAlert.svelte';
	import * as Field from '$lib/components/ui/field';
	import { Input } from '$lib/components/ui/input';
	import SubmitButton from '$lib/components/SubmitButton.svelte';

	let { params }: PageProps = $props();
	const org = $derived(await getOrganization({ slug: params.orgSlug }));

	const validateOrg = () => {
		if (org.type !== 'league') {
			redirect(303, resolve('/dashboard/[orgSlug]', { orgSlug: org.slug }));
		}
	};
	validateOrg();

	const currentSeason = $derived(await getCurrentSeason({ organizationId: org.id }));
	const players = $derived(
		currentSeason ? await getSeasonPlayers({ seasonId: currentSeason.id }) : []
	);

	let copiedId = $state<string | null>(null);
	let lastInviteUrl = $state<string | null>(null);
	let inviteCopied = $state(false);
	let submitting = $derived(!!inviteFamily.pending);

	const relationshipLabels: Record<(typeof familyRelationships)[number], string> = {
		parent: 'Parent',
		guardian: 'Guardian',
		relative: 'Relative',
		fan: 'Fan',
		other: 'Other',
	};

	function playerHref(player: (typeof players)[number]) {
		if (!currentSeason) return '#';
		return resolve(
			'/dashboard/[orgSlug]/seasons/[seasonSlug]/[divisionSlug]/[teamSlug]/[jerseyNumber]',
			{
				orgSlug: params.orgSlug,
				seasonSlug: currentSeason.slug,
				divisionSlug: player.divisionSlug,
				teamSlug: player.teamSlug,
				jerseyNumber: String(player.jerseyNumber),
			}
		);
	}

	function teamHref(player: (typeof players)[number]) {
		if (!currentSeason) return '#';
		return resolve(
			'/dashboard/[orgSlug]/seasons/[seasonSlug]/[divisionSlug]/[teamSlug]',
			{
				orgSlug: params.orgSlug,
				seasonSlug: currentSeason.slug,
				divisionSlug: player.divisionSlug,
				teamSlug: player.teamSlug,
			}
		);
	}

	function absoluteStatsUrl(player: (typeof players)[number]) {
		return new URL(playerHref(player), page.url.origin).toString();
	}

	async function copyStatsLink(player: (typeof players)[number]) {
		await navigator.clipboard.writeText(absoluteStatsUrl(player));
		copiedId = player.id;
		setTimeout(() => {
			if (copiedId === player.id) copiedId = null;
		}, 2000);
	}

	async function copyInviteUrl(url: string) {
		await navigator.clipboard.writeText(url);
		inviteCopied = true;
		setTimeout(() => (inviteCopied = false), 2000);
	}
</script>

<svelte:head>
	<title>Players | {org.name} | {PUBLIC_APP_NAME}</title>
</svelte:head>

<div class="min-h-full bg-[#0D1117] text-[#E6EDF3]">
	<div class="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-6">
		<header>
			<p class="text-xs font-semibold tracking-wide text-[#8B949E] uppercase">Manage</p>
			<h1 class="mt-1 text-2xl font-bold tracking-tight">Players</h1>
			{#if currentSeason}
				<p class="mt-1 text-sm text-[#8B949E]">
					{players.length} players in {currentSeason.name}. Invite families or copy a stats link.
				</p>
			{/if}
		</header>

		{#if !currentSeason}
			<ActiveSeasonGate organizationId={org.id} orgSlug={params.orgSlug} />
		{:else if players.length === 0}
			<div class="rounded-2xl border border-[#2A3038] bg-[#161B22] p-6 text-center">
				<p class="text-sm text-[#8B949E]">No players in this season yet.</p>
				<a
					href={resolve('/dashboard/[orgSlug]/import', { orgSlug: params.orgSlug })}
					class="mt-4 inline-flex rounded-md bg-[#58A6FF] px-3 py-2 text-sm font-semibold text-[#0D1117]"
				>
					Import spreadsheet
				</a>
			</div>
		{:else}
			<section class="rounded-2xl border border-[#2A3038] bg-[#161B22] p-5 sm:p-6">
				<h2 class="text-sm font-semibold tracking-wide text-[#8B949E] uppercase">
					Invite player / family
				</h2>
				<p class="mt-1 text-sm text-[#8B949E]">
					Creates an invite link you can copy and share. No email is sent from the app yet.
				</p>

				<form
					class="mt-4 space-y-3"
					{...inviteFamily.enhance(async ({ submit }) => {
						const ok = await submit();
						if (ok) {
							lastInviteUrl = inviteFamily.result?.inviteUrl ?? null;
						}
					})}
					{@attach focusFirstError({
						submitting,
						issues: inviteFamily.fields.allIssues(),
					})}
				>
					<Field.Set disabled={submitting}>
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
								<Input {...inviteFamily.fields.email.as('email')} placeholder="parent@email.com" />
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
							<SubmitButton {submitting}>Create invite link</SubmitButton>
						</div>
					</Field.Set>
				</form>

				{#if lastInviteUrl}
					<div
						class="mt-4 flex flex-col gap-2 rounded-xl border border-[#58A6FF]/40 bg-[#0D1117] p-4 sm:flex-row sm:items-center"
					>
						<div class="min-w-0 flex-1">
							<p class="text-xs font-semibold tracking-wide text-[#58A6FF] uppercase">
								Invite link ready — share it with the family
							</p>
							<p class="mt-1 truncate font-mono text-sm text-[#E6EDF3]">{lastInviteUrl}</p>
						</div>
						<button
							type="button"
							class="inline-flex items-center justify-center gap-2 rounded-md bg-[#58A6FF] px-3 py-2 text-sm font-semibold text-[#0D1117]"
							onclick={() => copyInviteUrl(lastInviteUrl!)}
						>
							{#if inviteCopied}
								<CheckIcon class="size-4" /> Copied
							{:else}
								<ClipboardIcon class="size-4" /> Copy link
							{/if}
						</button>
					</div>
				{/if}
			</section>

			<div class="overflow-hidden rounded-2xl border border-[#2A3038] bg-[#161B22]">
				<table class="w-full text-left text-sm">
					<thead class="border-b border-[#2A3038] text-xs tracking-wide text-[#8B949E] uppercase">
						<tr>
							<th class="px-4 py-3 font-semibold">#</th>
							<th class="px-4 py-3 font-semibold">Player</th>
							<th class="px-4 py-3 font-semibold">Team</th>
							<th class="hidden px-4 py-3 font-semibold sm:table-cell">Division</th>
							<th class="px-4 py-3 font-semibold">Share</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-[#2A3038]">
						{#each players as player (player.id)}
							<tr class="hover:bg-[#1C2128]">
								<td class="px-4 py-2.5 text-[#8B949E] tabular-nums">{player.jerseyNumber}</td>
								<td class="px-4 py-2.5">
									<a href={playerHref(player)} class="font-medium text-[#58A6FF] hover:underline">
										{player.name}
									</a>
								</td>
								<td class="px-4 py-2.5">
									<a href={teamHref(player)} class="text-[#E6EDF3] hover:text-[#58A6FF]">
										{player.teamName}
									</a>
								</td>
								<td class="hidden px-4 py-2.5 text-[#8B949E] sm:table-cell">
									{player.divisionName}
								</td>
								<td class="px-4 py-2.5">
									<button
										type="button"
										class="inline-flex items-center gap-1.5 rounded-md border border-[#2A3038] px-2 py-1 text-xs font-medium text-[#E6EDF3] hover:border-[#58A6FF] hover:text-[#58A6FF]"
										onclick={() => copyStatsLink(player)}
									>
										{#if copiedId === player.id}
											<CheckIcon class="size-3.5" /> Copied
										{:else}
											<ClipboardIcon class="size-3.5" /> Copy stats link
										{/if}
									</button>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>
</div>
