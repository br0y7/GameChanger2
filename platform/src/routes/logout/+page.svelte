<script lang="ts">
	import { PUBLIC_APP_URL } from '$env/static/public';
	import { authClient } from '$lib/auth-client';
	import { Spinner } from '$lib/components/ui/spinner';
	import { onMount } from 'svelte';

	// Using this page so this server can remove the cookie.
	// If you try to call the /api/auth/signout in Streamlit it
	// won't clear the cookie.
	onMount(async () => {
		await authClient.signOut();
		window.location.replace(PUBLIC_APP_URL);
	});
</script>

<div class="flex flex-col min-h-svh items-center justify-center">
	<div class="w-full max-w-sm flex flex-col items-center">
		<Spinner class="size-8" />
		<h1 class="text-2xl">Signing out...</h1>
	</div>
</div>
