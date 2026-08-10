<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { PUBLIC_APP_NAME } from '$env/static/public';
	import { isAuthenticated } from '$lib/api/auth.remote';
	import { authClient } from '$lib/auth-client';
	import { Spinner } from '$lib/components/ui/spinner';
	import { onMount } from 'svelte';

	// Using this page so this server can remove the cookie.
	// If you try to call the /api/auth/signout in Streamlit it
	// won't clear the cookie.
	onMount(async () => {
		await authClient.signOut();
		await isAuthenticated().refresh();
		await goto(resolve('/'));
	});
</script>

<svelte:head>
	<title>Logging Out | {PUBLIC_APP_NAME}</title>
</svelte:head>

<div class="flex min-h-svh flex-col items-center justify-center">
	<div class="flex w-full max-w-sm flex-col items-center">
		<Spinner class="size-8" />
		<h1 class="text-2xl">Logging out...</h1>
	</div>
</div>
