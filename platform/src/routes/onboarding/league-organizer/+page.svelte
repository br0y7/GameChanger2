<script lang="ts">
	import type { PageProps } from './$types';
	import SlideContainer from '$lib/components/SlideContainer.svelte';
	import SeasonForm from './SeasonForm.svelte';
	import { ORGANIZER_STEPS, type OrganizerOnboardingStep } from '$lib/onboarding/steps';
	import LeagueForm from './LeagueForm.svelte';

	let { form, data }: PageProps = $props();

	let currentStep = $derived(data.onboarding.currentStep as OrganizerOnboardingStep);
</script>

<div
	class="flex
	min-h-screen w-full
	items-center justify-center"
>
	<div class="flex flex-col w-full max-w-sm">
		<h2 class="text-center text-muted-foreground">
			Step {ORGANIZER_STEPS.indexOf(currentStep) + 1} of {ORGANIZER_STEPS.length - 1}
		</h2>
		<!-- Use css grid so the layout doesn't shift when transitioning. -->
		<div class="grid grid-cols-1 grid-rows-1 overflow-hidden">
			{#if currentStep === 'create-league'}
				<SlideContainer class="col-start-1 row-start-1 flex flex-col gap-6">
					<LeagueForm {form} />
				</SlideContainer>
			{:else if currentStep === 'create-season'}
				<SlideContainer class="col-start-1 row-start-1 flex flex-col gap-6">
					<SeasonForm {form} />
				</SlideContainer>
			{:else if currentStep === 'setup-league'}
				<SlideContainer class="col-start-1 row-start-1 w-full h-full">
					add teams invite coaches
				</SlideContainer>
			{/if}
		</div>
	</div>
</div>
