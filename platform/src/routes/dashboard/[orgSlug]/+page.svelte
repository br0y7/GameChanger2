<script lang="ts">
	import { PUBLIC_APP_NAME } from '$env/static/public';
	import { getOrganization } from '$lib/api/organization.remote';
	import type { PageProps } from './$types';
	import AdminOverview from './AdminOverview.svelte';
	import LeagueOrganizerOverview from './LeagueOrganizerOverview.svelte';

	let { params }: PageProps = $props();
	const org = $derived(await getOrganization({ slug: params.orgSlug }));
</script>

<svelte:head>
	<title>{org.name} Dashboard | {PUBLIC_APP_NAME}</title>
</svelte:head>

{#if org.type === 'league'}
	<LeagueOrganizerOverview {org} />
{:else if org.type === 'system'}
	<AdminOverview {org} />
{/if}
