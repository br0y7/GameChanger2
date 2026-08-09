<script lang="ts">
	import { page } from '$app/state';

	const errorMessage = () => {
		switch (page.status) {
			case 401:
				return 'You need to log in';
			case 403:
				return 'You do not have permission to access this page';
			case 404:
				return 'Page Not Found';
			case 500:
				return 'Something went wrong on our end';
			default:
				return 'Something went wrong';
		}
	};
</script>

<div class="flex min-h-svh flex-col items-center justify-center">
	<div class="flex w-full flex-col items-center gap-4">
		<div class="flex items-center gap-2">
			<h1 class="status leading-none text-error">{page.status}</h1>
		</div>
		<p class="message text-center">
			{errorMessage()}
		</p>
	</div>
</div>

<style>
	/* tailwind text-sizes not working so using Svelte's scoped css */
	.status {
		font-size: 8rem;
	}
	.message {
		font-size: 1.5rem;
	}
</style>
