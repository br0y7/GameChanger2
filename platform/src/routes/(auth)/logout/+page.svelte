<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { PUBLIC_APP_NAME } from '$env/static/public';
	import { isAuthenticated } from '$lib/api/auth.remote';
	import { authClient } from '$lib/auth-client';
	import { Spinner } from '$lib/components/ui/spinner';
	import { REDIRECT_TO_PARAM } from '$lib/utils/url';
	import { onMount } from 'svelte';

	function safePostLogoutPath(value: string | null): string {
		if (!value || !value.startsWith('/') || value.startsWith('//')) {
			return resolve('/');
		}
		return value;
	}

	// Using this page so this server can remove the cookie.
	// If you try to call the /api/auth/signout in Streamlit it
	// won't clear the cookie.
	onMount(async () => {
		await authClient.signOut();
		await isAuthenticated().refresh();
		await goto(safePostLogoutPath(page.url.searchParams.get(REDIRECT_TO_PARAM)));
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
