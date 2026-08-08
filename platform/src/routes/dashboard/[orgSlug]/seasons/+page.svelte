<script lang="ts">
	import { getOrganization } from '$lib/api/organization.remote';
	import SeasonTable from '$lib/components/SeasonTable.svelte';
	import SubmitButton from '$lib/components/SubmitButton.svelte';
	import { Separator } from '$lib/components/ui/separator';
	import SeasonForm from '$lib/forms/SeasonForm.svelte';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();
	const org = $derived(await getOrganization({ slug: params.orgSlug }));
</script>

<div class="grid grid-cols-1 gap-6 p-8 lg:grid-cols-2">
	<section class="text-center lg:col-span-2">
		<h1 class="text-center text-2xl font-bold">Seasons for {org.name}</h1>
		<p class="text-sm">You can manage divisions by clicking a season's name below.</p>
	</section>

	<Separator class="lg:col-span-2" />

	<section class="flex justify-center">
		<div class="w-full max-w-lg min-w-xs">
			<h2 class="text-center text-xl font-medium">Add a Season</h2>
			<SeasonForm>
				{#snippet submitButton({ submitting })}
					<SubmitButton {submitting} class="hover:scale-102">
						{#snippet icon()}
							<PlusIcon />
						{/snippet}
						Add Season
					</SubmitButton>
				{/snippet}
			</SeasonForm>
		</div>
	</section>

	<section>
		<SeasonTable {org} />
	</section>
</div>
