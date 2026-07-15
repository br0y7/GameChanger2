<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
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

<div class="flex flex-col min-h-svh items-center justify-center">
	<div class="w-full max-w-sm flex flex-col items-center">
		<Spinner class="size-8" />
		<h1 class="text-2xl">Logging out...</h1>
	</div>
</div>
