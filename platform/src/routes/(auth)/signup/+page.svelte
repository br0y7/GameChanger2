<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { env } from '$env/dynamic/public';
	import { isAuthenticated } from '$lib/api/auth.remote';
	import SignupForm from '$lib/forms/SignupForm.svelte';
	import { redirect } from '@sveltejs/kit';
	import { REDIRECT_TO_PARAM } from '$lib/utils/url';
	import type { SignupRole } from '$lib/schemas/auth';

	const redirectTo = page.url.searchParams.get(REDIRECT_TO_PARAM);
	const email = page.url.searchParams.get('email') ?? '';
	const fromCoachInvite = !!redirectTo?.startsWith('/invite/coach');
	const fromFamilyInvite = !!redirectTo?.startsWith('/invite/family');
	const fromInvite = fromCoachInvite || fromFamilyInvite;

	const fixedRole: SignupRole | null = fromCoachInvite
		? 'coach'
		: fromFamilyInvite
			? 'player_follower'
			: null;

	const title = fromCoachInvite
		? 'Create your coach account'
		: fromFamilyInvite
			? 'Create your family account'
			: undefined;
	const description = fromInvite
		? 'Create an account to accept your invitation.'
		: 'Choose how you want to use GameChanger, then create your account.';

	if (await isAuthenticated()) {
		redirect(307, redirectTo?.startsWith('/invite/') ? redirectTo : resolve('/'));
	}
</script>

<svelte:head>
	<title>Create your account | {env.PUBLIC_APP_NAME}</title>
	<meta name="description" content="Get started to track stats, manage teams, and more." />
</svelte:head>

<div class="flex min-h-[calc(100svh-4rem)] flex-col items-center justify-center gap-6 p-6 md:p-10">
	<div
		class="w-full max-w-md rounded-xl border border-white/10 bg-[#151D19] p-6 text-[#E8F0EA] shadow-none sm:p-8"
	>
		<SignupForm
			class="auth-dark"
			{email}
			{title}
			{description}
			{fixedRole}
			showRolePicker={!fromInvite}
		/>
	</div>
</div>

<style>
	:global(.auth-dark label),
	:global(.auth-dark h1),
	:global(.auth-dark a) {
		color: #e8f0ea;
	}
	:global(.auth-dark [data-slot='field-description']),
	:global(.auth-dark .text-muted-foreground) {
		color: #8fa398 !important;
	}
	:global(.auth-dark input) {
		border-color: rgb(255 255 255 / 0.15);
		background: #0c1210;
		color: #e8f0ea;
	}
	:global(.auth-dark input:focus-visible) {
		border-color: #b8e05c;
		outline-color: #b8e05c;
	}
	:global(.auth-dark button[type='submit']) {
		background: #b8e05c;
		color: #0c1210;
	}
	:global(.auth-dark button[type='submit']:hover) {
		background: #c8e06a;
	}
	:global(.auth-dark a) {
		color: #b8e05c;
		text-decoration-line: underline;
		text-underline-offset: 3px;
	}
</style>
