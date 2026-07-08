<script lang="ts">
	import SlideContainer from '$lib/components/SlideContainer.svelte';
	import SeasonForm from './SeasonForm.svelte';
	import { ORGANIZER_STEPS, type OrganizerOnboardingStep } from '$lib/onboarding/steps';
	import LeagueForm from './LeagueForm.svelte';
	import { requireSession, requireUser } from '$lib/api/auth.remote';
	import { getOnboarding } from '$lib/api/onboarding.remote';
	import CreateDivisionForm from './CreateDivisionForm.svelte';
	import { getCurrentSeason } from '$lib/api/season.remote';
	import Collapsible from '$lib/components/Collapsible.svelte';
	import DivisionAccordion from './DivisionAccordion.svelte';
	import SubmitButton from '$lib/components/SubmitButton.svelte';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import { getDivisions } from '$lib/api/division.remote';

	const user = $derived(await requireUser());
	const onboarding = $derived(await getOnboarding({ userId: user.id }));
	const currentStep = $derived(onboarding.currentStep as OrganizerOnboardingStep);

	const session = $derived(await requireSession());
	const season = $derived(
		session.activeOrganizationId
			? await getCurrentSeason({
					organizationId: session.activeOrganizationId,
				})
			: null
	);

	const divisions = $derived(season ? await getDivisions({ seasonId: season.id }) : []);

	let submitting = $state(false);
</script>

<div
	class="flex
	min-h-screen w-full
	items-center justify-center"
>
	<div class="flex flex-col w-full min-w-sm max-w-xl p-4">
		<h2 class="text-center text-muted-foreground">
			Step {ORGANIZER_STEPS.indexOf(currentStep) + 1} of {ORGANIZER_STEPS.length - 1}
		</h2>
		<!-- Use css grid so the layout doesn't shift when transitioning. -->
		<div class="grid grid-cols-1 grid-rows-1 overflow-hidden">
			{#if currentStep === 'create-league'}
				<SlideContainer class="col-start-1 row-start-1 flex flex-col gap-6">
					<LeagueForm />
				</SlideContainer>
			{:else if currentStep === 'create-season'}
				<SlideContainer class="col-start-1 row-start-1 flex flex-col gap-6">
					<SeasonForm />
				</SlideContainer>
			{:else if currentStep === 'setup-league'}
				<SlideContainer class="col-start-1 row-start-1 w-full h-full">
					<div class="flex flex-col gap-6">
						<div class="flex flex-col gap-1">
							<h1 class="text-2xl font-bold text-center">Setup your League</h1>
							<p class="text-center text-muted-foreground">
								Add your league's divisions and assign teams per each. You can edit them anytime and
								invite coaches later.
							</p>
						</div>
						{#if season}
							<CreateDivisionForm seasonId={season.id} />
							<Collapsible isOpen={divisions.length > 0} class="flex flex-col gap-4">
								<DivisionAccordion {divisions} />
								<form action="?/complete" method="POST" class="w-full flex justify-center">
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
							</Collapsible>
							<Collapsible isOpen={divisions.length <= 0}>
								<form action="?/complete" method="POST" class="w-full flex justify-center">
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
							</Collapsible>
						{/if}
					</div>
				</SlideContainer>
			{/if}
		</div>
	</div>
</div>
