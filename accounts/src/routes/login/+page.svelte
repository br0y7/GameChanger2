<script lang="ts">
	import ModeToggle from '$lib/components/ui/ModeToggle.svelte';
	import LoginForm from './LoginForm.svelte';
	import { env } from '$env/dynamic/public';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
</script>

<svelte:head>
	<title>Welcome back | {env.PUBLIC_APP_NAME}</title>
	<meta name="description" content="Sign in to check updates, manage teams, and more." />
</svelte:head>

<div class="bg-background flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
	<div class="absolute top-4 right-4 z-50">
		<ModeToggle />
	</div>
	<div class="w-full max-w-sm">
		<LoginForm {form} />
	</div>
</div>
