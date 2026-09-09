<script lang="ts">
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button';
</script>

<div class="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8 text-center">
	<h1 class="text-2xl font-bold">No active organization</h1>
	<p class="text-muted-foreground max-w-md">
		Your account isn’t linked to a league or team yet. Finish onboarding, or ask an admin to add you
		to one.
	</p>
	<Button href={resolve('/onboarding')}>Go to onboarding</Button>
</div>
