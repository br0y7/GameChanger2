<script lang="ts">
	import { getOrganization } from '$lib/api/organization.remote';
	import LeagueOrganizerOverview from './LeagueOrganizerOverview.svelte';

	const org = await getOrganization();
</script>

{#if org.type === 'league'}
	<LeagueOrganizerOverview />
{/if}
