<script lang="ts">
	import { requireLeagueOrganizer } from '$lib/api/league.remote';
	import { getOrganization } from '$lib/api/organization.remote';
	import SeasonTable from '$lib/components/SeasonTable.svelte';
	import SubmitButton from '$lib/components/SubmitButton.svelte';
	import { Separator } from '$lib/components/ui/separator';
	import SeasonForm from '$lib/forms/SeasonForm.svelte';
	import PlusIcon from '@lucide/svelte/icons/plus';

	const org = $derived(await getOrganization());

	await requireLeagueOrganizer();
</script>

<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 p-8">
	<section class="lg:col-span-2 text-center">
		<h1 class="text-2xl text-center font-bold">Seasons for {org.name}</h1>
		<p class="text-sm">You can manage divisions by clicking a season's name below.</p>
	</section>

	<Separator class="lg:col-span-2" />

	<section class="flex justify-center">
		<div class="min-w-xs w-full max-w-lg">
			<h2 class="text-xl text-center font-medium">Add a Season</h2>
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
		<SeasonTable organizationId={org.id} />
	</section>
</div>
