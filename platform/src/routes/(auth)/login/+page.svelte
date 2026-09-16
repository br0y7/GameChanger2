<script lang="ts">
	import { env } from '$env/dynamic/public';
	import { page } from '$app/state';
	import LoginForm from '$lib/forms/LoginForm.svelte';

	let email = $derived(page.url.searchParams.get('email') ?? '');
</script>

<svelte:head>
	<title>Welcome back | {env.PUBLIC_APP_NAME}</title>
	<meta name="description" content="Sign in to check updates, manage teams, and more." />
</svelte:head>

<div class="flex min-h-[calc(100svh-4rem)] flex-col items-center justify-center gap-6 p-6 md:p-10">
	<div
		class="w-full max-w-sm rounded-xl border border-white/10 bg-[#151D19] p-6 text-[#E8F0EA] sm:p-8"
	>
		<LoginForm class="auth-dark" {email} />
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
