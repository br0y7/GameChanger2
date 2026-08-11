<script lang="ts">
	import { ORGANIZER_STEPS, type OrganizerOnboardingStep } from '$lib/onboarding/steps';
	import LeagueForm from './LeagueForm.svelte';
	import { getCurrentSeason } from '$lib/api/season.remote';
	import { requireSession, requireUser } from '$lib/api/auth.remote';
	import { getOnboarding } from '$lib/api/onboarding.remote';
	import SetupLeagueStep from './SetupLeagueStep.svelte';
	import SlideTransition from '$lib/components/transitions/SlideTransition.svelte';
	import SeasonForm from '$lib/forms/SeasonForm.svelte';
	import { PUBLIC_APP_NAME } from '$env/static/public';

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

<svelte:head>
	<title>Onboarding League Organizer {user.name} | {PUBLIC_APP_NAME}</title>
</svelte:head>

<div
	class="flex
	min-h-screen w-full
	items-center justify-center"
>
	<div class="flex w-full max-w-xl min-w-sm flex-col p-4">
		<h2 class="text-center text-muted-foreground">
			Step {ORGANIZER_STEPS.indexOf(currentStep) + 1} of {ORGANIZER_STEPS.length - 1}
		</h2>
		<!-- Use css grid so the layout doesn't shift when transitioning. -->
		<div class="grid grid-cols-1 grid-rows-1 overflow-hidden">
			{#if currentStep === 'create-league'}
				<SlideTransition
					class="col-start-1 row-start-1 flex w-full flex-col gap-6 justify-self-center px-8"
				>
					<LeagueForm />
				</SlideTransition>
			{:else if currentStep === 'create-season'}
				<SlideTransition
					class="col-start-1 row-start-1 flex w-full flex-col gap-6 justify-self-center px-8"
				>
					<div class="flex flex-col gap-1">
						<h1 class="text-center text-2xl font-bold">Create your first Season</h1>
						<p class="text-center text-muted-foreground">
							Track teams, schedule games, and log results for your new season.
						</p>
					</div>
					<SeasonForm hideStatus />
				</SlideTransition>
			{:else if currentStep === 'setup-league'}
				<SlideTransition
					class="col-start-1 row-start-1 flex w-full flex-col gap-6 justify-self-center px-4"
				>
					{const season = await seasonPromise}
					{#if season}
						<SetupLeagueStep seasonId={season.id} />
					{/if}
				</SlideTransition>
			{/if}
		</div>
	</div>
</div>
