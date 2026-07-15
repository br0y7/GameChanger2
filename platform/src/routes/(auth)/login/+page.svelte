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

<div class="bg-background flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
	<div class="w-full max-w-sm">
		<LoginForm {email} />
	</div>
</div>
