<script lang="ts">
	import { getOrganization } from '$lib/api/organization.remote';
	import SeasonTable from '$lib/components/SeasonTable.svelte';
	import SubmitButton from '$lib/components/SubmitButton.svelte';
	import { Separator } from '$lib/components/ui/separator';
	import SeasonForm from '$lib/forms/SeasonForm.svelte';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import type { PageProps } from './$types';
	import { isUserLeagueOrganizer } from '$lib/api/league.remote';

	let { params }: PageProps = $props();
	const isOrganizer = $derived(await isUserLeagueOrganizer());
</script>

{const org = await getOrganization({ slug: params.orgSlug })}

<div class="grid grid-cols-1 gap-6 p-8 lg:grid-cols-2">
	<section class="text-center lg:col-span-2">
		<h1 class="text-center text-2xl font-bold">Seasons for {org.name}</h1>
		{#if isOrganizer}
			<p class="text-sm">You can manage divisions by clicking a season's name below.</p>
		{/if}
	</section>

	<Separator class="lg:col-span-2" />

	{#if isOrganizer}
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
	{/if}

	<section
		class={isOrganizer
			? 'w-full max-w-3xl justify-self-center'
			: 'w-full max-w-3xl lg:col-span-2 lg:w-3/5 lg:justify-self-center'}
	>
		<SeasonTable {org} canEdit={isOrganizer} canDelete={isOrganizer} />
	</section>
</div>
