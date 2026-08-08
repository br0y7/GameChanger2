<script lang="ts">
	import { getUserCount } from '$lib/api/user.remote';
	import type { Organization } from '$lib/server/db/auth-schema';

	let { org }: { org: Organization } = $props();
</script>

<div class="m-6 flex flex-col gap-6">
	<h1 class="text-2xl font-bold">{org.name} Overview</h1>

	<section>
		<p>Number of users: {await getUserCount()}</p>
		Fill these with potential admin actions or stats
	</section>
</div>
