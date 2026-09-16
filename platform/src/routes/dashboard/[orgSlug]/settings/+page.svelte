<script lang="ts">
	import { PUBLIC_APP_NAME } from '$env/static/public';
	import { isUserAdmin } from '$lib/api/auth.remote';
	import { getHomepageLeague, getOrganization } from '$lib/api/organization.remote';
	import { Separator } from '$lib/components/ui/separator';
	import UpdateLeagueForm from '$lib/forms/UpdateLeagueForm.svelte';
	import LeagueVisibilityForm from '$lib/forms/LeagueVisibilityForm.svelte';
	import LeagueLogoForm from '$lib/forms/LeagueLogoForm.svelte';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();
	const org = $derived(await getOrganization({ slug: params.orgSlug }));
	const isAdmin = $derived(await isUserAdmin());
	const homepageLeague = $derived(isAdmin ? await getHomepageLeague() : null);
	const logoLeague = $derived(org.type === 'league' ? org : homepageLeague);
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
		<section class="flex flex-col gap-6">
			<LeagueVisibilityForm organizationId={org.id} />
			<LeagueLogoForm league={org} />
		</section>
	{:else if isAdmin && logoLeague}
		<section class="lg:col-span-2 flex flex-col gap-6">
			<p class="text-center text-sm text-[#8B949E]">
				Homepage logo for <span class="font-medium text-[#E6EDF3]">{logoLeague.name}</span>
				(public site hero).
			</p>
			<div class="mx-auto w-full max-w-xl">
				<LeagueLogoForm league={logoLeague} />
			</div>
		</section>
	{:else if isAdmin}
		<section class="lg:col-span-2">
			<p class="text-center text-sm text-[#8B949E]">
				Create a league first, then you can upload the homepage logo here.
			</p>
		</section>
	{/if}
</div>
