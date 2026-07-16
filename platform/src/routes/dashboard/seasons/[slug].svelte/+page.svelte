<script lang="ts">
	import { getOrganization } from '$lib/api/organization.remote';
	import { getSeason } from '$lib/api/season.remote';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();

	const org = await getOrganization();

	const season = $derived(await getSeason({ slug: params.slug, organizationId: org.id }));
</script>

{season.name}
