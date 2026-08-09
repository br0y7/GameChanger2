<script lang="ts">
	import { isUserLeagueOrganizer } from '$lib/api/league.remote';
	import { getOrganization } from '$lib/api/organization.remote';
	import { getSeason } from '$lib/api/season.remote';
	import DivisionAccordion from '$lib/components/DivisionAccordion.svelte';
	import { Separator } from '$lib/components/ui/separator';
	import CreateDivisionForm from '$lib/forms/CreateDivisionForm.svelte';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();
	const isOrganizer = $derived(await isUserLeagueOrganizer());
</script>

<div class="grid grid-cols-1 gap-6 p-8 lg:grid-cols-2">
	{const org = await getOrganization({ slug: params.orgSlug })}
	{const season = await getSeason({ slug: params.seasonSlug, organizationId: org.id })}

	<section class="text-center lg:col-span-2">
		<h1 class="text-center text-2xl font-bold">{season.name}</h1>
		{#if isOrganizer}
			<p class="text-sm">Manage divisions for {season.name}</p>
		{/if}
	</section>

	<Separator class="lg:col-span-2" />

	{#if isOrganizer}
		<section class="flex justify-center">
			<div class="w-full max-w-lg min-w-xs">
				<h2 class="text-center text-xl font-medium">Add a Division</h2>
				<CreateDivisionForm seasonId={season.id} />
			</div>
		</section>
	{/if}

	<section
		class={isOrganizer
			? 'w-full max-w-3xl justify-self-center'
			: 'w-full max-w-3xl lg:col-span-2 lg:w-3/5 lg:justify-self-center'}
	>
		<DivisionAccordion
			orgSlug={params.orgSlug}
			seasonId={season.id}
			confirmDelete
			canEdit={isOrganizer}
			canDelete={isOrganizer}
		/>
	</section>
</div>
