<script lang="ts">
	import { PUBLIC_APP_NAME } from '$env/static/public';
	import { resolve } from '$app/paths';
</script>

<svelte:head>
	<title>Demo unavailable | {PUBLIC_APP_NAME}</title>
</svelte:head>

<div class="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
	<div class="w-full max-w-md space-y-4 rounded-2xl border p-6 shadow-sm">
		<h1 class="text-xl font-bold">This demo link isn’t available</h1>
		<p class="text-sm text-muted-foreground">
			It may have expired or been turned off. Ask the admin to send a new one.
		</p>
		<a class="text-sm font-medium text-primary underline" href={resolve('/')}>Back to home</a>
	</div>
</div>
