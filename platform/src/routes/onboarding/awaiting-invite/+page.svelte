<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { PUBLIC_APP_NAME } from '$env/static/public';
	import { requireUser } from '$lib/api/auth.remote';
	import { getOnboarding, startAwaitingInvite, startSoloCoachOnboarding } from '$lib/api/onboarding.remote';
	import SubmitButton from '$lib/components/SubmitButton.svelte';

	const user = await requireUser();
	const onboarding = $derived(await getOnboarding({ userId: user.id }));

	const isCoach = $derived(onboarding.role === 'coach');
	const isFamily = $derived(
		onboarding.role === 'player_follower' || onboarding.role === 'player'
	);

	let inviteUrl = $state('');
	let inviteError = $state('');

	function openInviteLink() {
		inviteError = '';
		const raw = inviteUrl.trim();
		if (!raw) {
			inviteError = 'Paste the invite link from your email.';
			return;
		}
		try {
			const url = raw.startsWith('http') ? new URL(raw) : new URL(raw, window.location.origin);
			const isCoachInvite = url.pathname.startsWith('/invite/coach/');
			const isFamilyInvite = url.pathname.startsWith('/invite/family/');
			if (isCoach && !isCoachInvite) {
				inviteError = 'Use a coach invite link (/invite/coach/…).';
				return;
			}
			if (isFamily && !isFamilyInvite) {
				inviteError = 'Use a family / player invite link (/invite/family/…).';
				return;
			}
			if (!isCoachInvite && !isFamilyInvite) {
				inviteError = 'That does not look like a GameChanger invite link.';
				return;
			}
			goto(url.pathname + url.search);
		} catch {
			inviteError = 'Enter a valid invite URL.';
		}
	}

	let soloPending = $derived(!!startSoloCoachOnboarding.pending);
	let switchPending = $derived(!!startAwaitingInvite.pending);
</script>

<svelte:head>
	<title>Waiting for invite | {PUBLIC_APP_NAME}</title>
</svelte:head>

<div class="mx-auto flex min-h-[70vh] max-w-lg flex-col justify-center gap-6 p-6">
	<div>
		<p class="text-xs font-semibold tracking-[0.18em] text-[#8FA398] uppercase">Almost there</p>
		<h1 class="mt-2 text-3xl font-bold tracking-tight" style="font-family: 'Barlow Condensed', system-ui, sans-serif">
			{#if isCoach}
				You're signed up as a coach
			{:else if isFamily}
				You're signed up as a player / family
			{:else}
				Waiting for an invite
			{/if}
		</h1>
		<p class="mt-3 text-sm leading-relaxed text-[#A8B8AE]">
			{#if isCoach}
				You are not on a team yet. Ask your league organizer to invite you, then open the link from
				your email — you'll land in your Coach Portal.
			{:else}
				You are not linked to a player yet. Ask your coach or organizer for a family invite link —
				you'll land on your player's page after you accept.
			{/if}
		</p>
	</div>

	<section class="rounded-xl border border-white/10 bg-[#151D19] p-5">
		<label class="block text-sm font-medium text-[#E8F0EA]" for="invite-url">
			Have an invite link?
		</label>
		<div class="mt-2 flex flex-col gap-2 sm:flex-row">
			<input
				id="invite-url"
				type="url"
				bind:value={inviteUrl}
				placeholder={isCoach
					? 'https://…/invite/coach/…'
					: 'https://…/invite/family/…'}
				class="min-w-0 flex-1 rounded-md border border-white/15 bg-[#0C1210] px-3 py-2 text-sm text-[#E8F0EA]"
			/>
			<button
				type="button"
				class="rounded-md bg-[#B8E05C] px-4 py-2 text-sm font-semibold text-[#0C1210] hover:bg-[#C8E06A]"
				onclick={openInviteLink}
			>
				Open invite
			</button>
		</div>
		{#if inviteError}
			<p class="mt-2 text-sm text-[#F85149]">{inviteError}</p>
		{/if}
	</section>

	{#if isCoach}
		<form class="text-center" {...startSoloCoachOnboarding}>
			<p class="mb-2 text-xs text-[#8FA398]">Running your own team outside a league?</p>
			<button
				type="submit"
				class="rounded-md border border-white/20 px-4 py-2 text-sm font-medium text-[#E8F0EA] hover:border-[#B8E05C]/50 disabled:opacity-50"
				disabled={soloPending}
			>
				{soloPending ? 'Starting…' : 'Create a solo team instead'}
			</button>
		</form>
		<form class="text-center" {...startAwaitingInvite}>
			<input {...startAwaitingInvite.fields.role.as('hidden', 'player_follower')} />
			<p class="mb-2 text-xs text-[#8FA398]">Signed up as the wrong type?</p>
			<SubmitButton submitting={switchPending} class="max-w-xs">
				Switch to Player / Family
			</SubmitButton>
		</form>
	{/if}

	{#if isFamily}
		<form class="text-center" {...startAwaitingInvite}>
			<input {...startAwaitingInvite.fields.role.as('hidden', 'coach')} />
			<p class="mb-2 text-xs text-[#8FA398]">Signed up as the wrong type?</p>
			<SubmitButton submitting={switchPending} class="max-w-xs">Switch to Coach</SubmitButton>
		</form>
	{/if}

	<p class="text-center text-sm text-[#8FA398]">
		<a href={resolve('/logout')} class="text-[#B8E05C] hover:underline">Sign out</a>
	</p>
</div>
