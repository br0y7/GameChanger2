<script lang="ts">
	import { completeOnboarding } from '$lib/api/onboarding.remote';
	import CreateDivisionForm from './CreateDivisionForm.svelte';
	import DivisionAccordion from './DivisionAccordion.svelte';
	import SubmitButton from '$lib/components/SubmitButton.svelte';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import { getDivisions } from '$lib/api/division.remote';
	import ExpandTransition from '$lib/components/transitions/ExpandTransition.svelte';

	interface Props {
		seasonId: string;
	}
	let { seasonId }: Props = $props();

	let submitting = $state(false);
	let divisions = $derived(await getDivisions({ seasonId }));
	let hasDivisions = $derived(divisions.length > 0);
</script>

<div class="flex flex-col gap-6">
	<div class="flex flex-col gap-1">
		<h1 class="text-2xl font-bold text-center">Setup your League</h1>
		<p class="text-center text-muted-foreground">
			Add your league's divisions and assign teams per each. You can edit them anytime and invite
			coaches later.
		</p>
	</div>
	<CreateDivisionForm {seasonId} />
	{#if hasDivisions}
		<ExpandTransition class="flex flex-col gap-4">
			<DivisionAccordion {divisions} />
			<form {...completeOnboarding.for('done')} class="w-full flex justify-center">
				<SubmitButton
					{submitting}
					class="w-1/2 hover:-translate-y-0.5
									duration-300 transition-transform
									group"
				>
					Finish Setup
					<ArrowRight
						class="-translate-x-1 transition-transform duration-200 group-hover:translate-x-0"
					/>
				</SubmitButton>
			</form>
		</ExpandTransition>
	{:else}
		<ExpandTransition>
			<form {...completeOnboarding.for('skip')} class="w-full flex justify-center">
				<SubmitButton
					variant="secondary"
					{submitting}
					class="w-1/2 hover:-translate-y-0.5
												duration-300 transition-transform
												group"
				>
					Skip for now
					<ChevronRight
						class="-translate-x-1 transition-transform duration-200 group-hover:translate-x-0"
					/>
				</SubmitButton>
			</form>
		</ExpandTransition>
	{/if}
</div>
