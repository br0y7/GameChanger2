<script lang="ts">
	import SignupForm from './SignupForm.svelte';
	import { env } from '$env/dynamic/public';
</script>

<svelte:head>
	<title>Create your account | {env.PUBLIC_APP_NAME}</title>
	<meta name="description" content="Get started to track stats, manage teams, and more." />
</svelte:head>

<div class="bg-background flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
	<div class="w-full max-w-sm">
		<SignupForm />
	</div>
</div>
