<script lang="ts">
	import { getOrganization } from '$lib/api/organization.remote';
	import { Separator } from '$lib/components/ui/separator';
	import UpdateLeagueForm from '$lib/forms/UpdateLeagueForm.svelte';

	const org = $derived(await getOrganization());
</script>

<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 p-8">
	<section class="lg:col-span-2">
		<h1 class="text-2xl text-center font-bold">Settings for {org.name}</h1>
	</section>

	<Separator class="lg:col-span-2" />
	{#if org.type === 'league'}
		<section class="flex flex-col gap-6">
			<h2 class="text-xl text-center">Update League Info</h2>
			<UpdateLeagueForm league={org} />
		</section>
	{/if}
</div>
