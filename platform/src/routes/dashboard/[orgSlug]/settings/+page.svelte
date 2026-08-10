<script lang="ts">
	import { PUBLIC_APP_NAME } from '$env/static/public';
	import { getOrganization } from '$lib/api/organization.remote';
	import { Separator } from '$lib/components/ui/separator';
	import UpdateLeagueForm from '$lib/forms/UpdateLeagueForm.svelte';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();
	const org = $derived(await getOrganization({ slug: params.orgSlug }));
</script>

<svelte:head>
	<title>{org.name} Settings | {PUBLIC_APP_NAME}</title>
</svelte:head>

<div class="grid grid-cols-1 gap-6 p-8 lg:grid-cols-2">
	<section class="lg:col-span-2">
		<h1 class="text-center text-2xl font-bold">Settings for {org.name}</h1>
	</section>

	<Separator class="lg:col-span-2" />
	{#if org.type === 'league'}
		<section class="flex flex-col gap-6">
			<h2 class="text-center text-xl">Update League Info</h2>
			<UpdateLeagueForm league={org} />
		</section>
	{/if}
</div>
