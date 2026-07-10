<script lang="ts">
	import { resolve } from '$app/paths';
	import { getUserCount } from '$lib/api/user.remote';
	import SignupForm from '$lib/forms/SignupForm.svelte';
	import { redirect } from '@sveltejs/kit';

	const hasAnyUsers = (await getUserCount()) > 0;

	if (hasAnyUsers) {
		redirect(307, resolve('/'));
	}
</script>

<div class="bg-background flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
	<div class="w-full max-w-sm">
		<SignupForm
			title="Create the first Admin Account"
			description="This is only occurs during initial server setup."
		/>
	</div>
</div>
