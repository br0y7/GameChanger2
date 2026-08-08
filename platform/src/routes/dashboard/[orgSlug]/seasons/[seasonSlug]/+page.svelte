<script lang="ts">
	import { getDivisions } from '$lib/api/division.remote';
	import { getOrganization } from '$lib/api/organization.remote';
	import { getSeason } from '$lib/api/season.remote';
	import DivisionAccordion from '$lib/components/DivisionAccordion.svelte';
	import { Separator } from '$lib/components/ui/separator';
	import CreateDivisionForm from '$lib/forms/CreateDivisionForm.svelte';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();
	const org = $derived(await getOrganization({ slug: params.orgSlug }));
	const season = $derived(await getSeason({ slug: params.seasonSlug, organizationId: org.id }));
	const divisions = $derived(await getDivisions({ seasonId: season.id }));
</script>

<div class="grid grid-cols-1 gap-6 p-8 lg:grid-cols-2">
	<section class="text-center lg:col-span-2">
		<h1 class="text-center text-2xl font-bold">{season.name}</h1>
		<p class="text-sm">Manage divisions for {season.name}</p>
	</section>

	<Separator class="lg:col-span-2" />

	<section class="flex justify-center">
		<div class="w-full max-w-lg min-w-xs">
			<h2 class="text-center text-xl font-medium">Add a Division</h2>
			<CreateDivisionForm seasonId={season.id} />
		</div>
	</section>

	<section>
		<DivisionAccordion orgSlug={params.orgSlug} {divisions} confirmDelete />
	</section>
</div>
