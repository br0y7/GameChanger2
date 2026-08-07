<script lang="ts">
	import { getDivisions } from '$lib/api/division.remote';
	import { getOrganization } from '$lib/api/organization.remote';
	import { getSeason } from '$lib/api/season.remote';
	import DivisionAccordion from '$lib/components/DivisionAccordion.svelte';
	import { Separator } from '$lib/components/ui/separator';
	import CreateDivisionForm from '$lib/forms/CreateDivisionForm.svelte';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();

	const org = await getOrganization();

	const season = $derived(await getSeason({ slug: params.seasonSlug, organizationId: org.id }));
	const divisions = $derived(await getDivisions({ seasonId: season.id }));
</script>

<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 p-8">
	<section class="lg:col-span-2 text-center">
		<h1 class="text-2xl text-center font-bold">{season.name}</h1>
		<p class="text-sm">Manage divisions for {season.name}</p>
	</section>

	<Separator class="lg:col-span-2" />

	<section class="flex justify-center">
		<div class="min-w-xs w-full max-w-lg">
			<h2 class="text-xl text-center font-medium">Add a Division</h2>
			<CreateDivisionForm seasonId={season.id} />
		</div>
	</section>

	<section>
		<DivisionAccordion {divisions} confirmDelete />
	</section>
</div>
