<script lang="ts">
	import { getOrganization } from '$lib/api/organization.remote';
	import { getUserCount } from '$lib/api/user.remote';

	const org = await getOrganization();
</script>

<div class="flex flex-col m-6 gap-6">
	<h1 class="text-2xl font-bold">{org.name} Overview</h1>

	<section>
		<p>Number of users: {await getUserCount()}</p>
		Fill these with potential admin actions or stats
	</section>
</div>
