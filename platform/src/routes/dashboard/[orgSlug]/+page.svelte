<script lang="ts">
	import { getOrganization } from '$lib/api/organization.remote';
	import type { PageProps } from './$types';
	import AdminOverview from './AdminOverview.svelte';
	import LeagueOrganizerOverview from './LeagueOrganizerOverview.svelte';

	let { params }: PageProps = $props();
	const org = $derived(await getOrganization({ slug: params.orgSlug }));
</script>

{#if org.type === 'league'}
	<LeagueOrganizerOverview {org} />
{:else if org.type === 'system'}
	<AdminOverview {org} />
{/if}
