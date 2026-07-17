<script lang="ts">
	import { resolve } from '$app/paths';
	import { env } from '$env/dynamic/public';
	import { isAuthenticated } from '$lib/api/auth.remote';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import SignupForm from '$lib/forms/SignupForm.svelte';
	import InfoIcon from '@lucide/svelte/icons/info';
	import { redirect } from '@sveltejs/kit';

	if (await isAuthenticated()) {
		redirect(307, resolve('/'));
	}
</script>

<svelte:head>
	<title>Create your account | {env.PUBLIC_APP_NAME}</title>
	<meta name="description" content="Get started to track stats, manage teams, and more." />
</svelte:head>

<div class="bg-background flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
	<div class="w-full max-w-sm">
		<SignupForm />
		<Alert.Root variant="no-border" class="mt-6">
			<InfoIcon class="size-6 stroke-info" />
			<Alert.Title class="text-base text-info-foreground">Player, Parent, or Fan?</Alert.Title>
			<Alert.Description class="text-foreground">
				You need an invite link to join. Check your email for an invitation, or ask your coach or
				organizer for access.
			</Alert.Description>
		</Alert.Root>
	</div>
</div>
