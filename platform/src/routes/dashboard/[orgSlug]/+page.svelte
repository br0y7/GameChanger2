<script lang="ts">
	import { getOrganization } from '$lib/api/organization.remote';
	import AdminOverview from './AdminOverview.svelte';
	import LeagueOrganizerOverview from './LeagueOrganizerOverview.svelte';

	const org = await getOrganization();
</script>

{#if org.type === 'league'}
	<LeagueOrganizerOverview />
{:else if org.type === 'system'}
	<AdminOverview />
{/if}
