<script lang="ts">
	import { PUBLIC_APP_NAME } from '$env/static/public';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import {
		acceptCoachInvite,
		getCoachInviteByToken,
	} from '$lib/api/coach.remote';
	import { getUser, isAuthenticated } from '$lib/api/auth.remote';
	import { REDIRECT_TO_PARAM } from '$lib/utils/url';
	import ErrorAlert from '$lib/components/ErrorAlert.svelte';
	import SubmitButton from '$lib/components/SubmitButton.svelte';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();
	const invite = $derived(await getCoachInviteByToken({ token: params.token }));
	const authed = $derived(await isAuthenticated());
	const user = $derived(await getUser());

	const loginHref = $derived(
		resolve(`/login?${new URLSearchParams({
			[REDIRECT_TO_PARAM]: page.url.pathname,
			...(invite.valid && invite.email ? { email: invite.email } : {}),
		})}`)
	);

	const signupHref = $derived(
		resolve(`/signup?${new URLSearchParams({
			[REDIRECT_TO_PARAM]: page.url.pathname,
			...(invite.valid && invite.email ? { email: invite.email } : {}),
		})}`)
	);

	/** Must sign out first — /login redirects away if already authenticated. */
	const switchAccountHref = $derived(
		resolve(
			`/logout?${new URLSearchParams({
				[REDIRECT_TO_PARAM]: loginHref,
			})}`
		)
	);

	let submitting = $derived(!!acceptCoachInvite.pending);
</script>

<svelte:head>
	<title>Coach Invitation | {PUBLIC_APP_NAME}</title>
</svelte:head>

<div class="bg-background flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
	<div class="w-full max-w-md space-y-6 rounded-2xl border p-6 shadow-sm">
		{#if !invite.valid}
			<div>
				<h1 class="text-xl font-bold">Invitation unavailable</h1>
				<p class="mt-2 text-sm text-muted-foreground">
					{#if invite.reason === 'expired'}
						This invitation to manage {invite.teamName} in {invite.leagueName} has expired. Ask
						your league organizer to resend it.
					{:else if invite.reason === 'accepted' && invite.orgSlug}
						This invitation was already accepted.
						<a
							class="text-primary underline"
							href={resolve('/dashboard/[orgSlug]/portal/[teamId]', {
								orgSlug: invite.orgSlug,
								teamId: invite.teamId!,
							})}
						>
							Open Coach Portal
						</a>
					{:else}
						This invitation is no longer valid.
					{/if}
				</p>
			</div>
		{:else}
			<div>
				<h1 class="text-xl font-bold">You're invited</h1>
				<p class="mt-2 text-sm text-muted-foreground">
					You've been invited to manage <strong>{invite.teamName}</strong> in
					<strong>{invite.leagueName}</strong>.
					Create or sign in to your account to access your Coach Portal.
				</p>
				{#if invite.email}
					<p class="mt-2 text-sm">Use <strong>{invite.email}</strong> to accept.</p>
				{/if}
			</div>

			{#if !authed}
				<div class="flex flex-col gap-2">
					<a
						href={signupHref}
						class="bg-primary text-primary-foreground inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-semibold"
					>
						Create account
					</a>
					<a
						href={loginHref}
						class="border-input inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium"
					>
						Sign in
					</a>
				</div>
			{:else}
				{#if user && invite.email && user.email.toLowerCase() !== invite.email.toLowerCase()}
					<p class="text-destructive text-sm">
						You're signed in as {user.email}. Sign in with {invite.email} to accept.
					</p>
					<a href={switchAccountHref} class="text-primary text-sm underline">Switch account</a>
				{:else}
					<form
						{...acceptCoachInvite.enhance(async ({ submit }) => {
							await submit();
						})}
					>
						<input {...acceptCoachInvite.fields.token.as('hidden', params.token)} />
						<ErrorAlert errors={acceptCoachInvite.fields.issues()} />
						<SubmitButton {submitting}>Accept invitation</SubmitButton>
					</form>
				{/if}
			{/if}
		{/if}
	</div>
</div>
