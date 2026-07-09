<script lang="ts">
	import SeasonForm from './SeasonForm.svelte';
	import { ORGANIZER_STEPS, type OrganizerOnboardingStep } from '$lib/onboarding/steps';
	import LeagueForm from './LeagueForm.svelte';
	import { getCurrentSeason } from '$lib/api/season.remote';
	import { requireSession, requireUser } from '$lib/api/auth.remote';
	import { getOnboarding } from '$lib/api/onboarding.remote';
	import SetupLeagueStep from './SetupLeagueStep.svelte';
	import SlideTransition from '$lib/components/transitions/SlideTransition.svelte';

	const user = await requireUser();
	const onboarding = $derived(await getOnboarding({ userId: user.id }));
	const currentStep = $derived(onboarding.currentStep as OrganizerOnboardingStep);

	const seasonPromise = $derived.by(async () => {
		const session = await requireSession();

		if (!session.activeOrganizationId) {
			return;
		}

		return await getCurrentSeason({ organizationId: session.activeOrganizationId });
	});
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
				<SlideTransition class="col-start-1 row-start-1 flex flex-col gap-6 p-1">
					<LeagueForm />
				</SlideTransition>
			{:else if currentStep === 'create-season'}
				<SlideTransition class="col-start-1 row-start-1 flex flex-col gap-6 p-1">
					<SeasonForm />
				</SlideTransition>
			{:else if currentStep === 'setup-league'}
				<SlideTransition class="col-start-1 row-start-1 w-full h-full p-1">
					{const season = await seasonPromise}
					{#if season}
						<SetupLeagueStep seasonId={season.id} />
					{/if}
				</SlideTransition>
			{/if}
		</div>
	</div>
</div>
