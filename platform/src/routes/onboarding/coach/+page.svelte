<script lang="ts">
	import { COACH_STEPS, type CoachOnboardingStep } from '$lib/onboarding/steps';
	import SoloCoachTeamForm from './SoloCoachTeamForm.svelte';
	import PlayerForm from './PlayerForm.svelte';
	import SubmitButton from '$lib/components/SubmitButton.svelte';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import PlayerTable from './PlayerTable.svelte';
	import { completeOnboarding, getOnboarding } from '$lib/api/onboarding.remote';
	import { getCoach } from '$lib/api/coach.remote';
	import { requireUser } from '$lib/api/auth.remote';
	import { getTeam } from '$lib/api/team.remote';
	import { PUBLIC_APP_NAME } from '$env/static/public';
	import SlideTransition from '$lib/components/transitions/SlideTransition.svelte';
	import ExpandTransition from '$lib/components/transitions/ExpandTransition.svelte';

	const user = $derived(await requireUser());

	const onboarding = $derived(await getOnboarding({ userId: user.id }));
	let currentStep = $derived(onboarding.currentStep as CoachOnboardingStep);

	const coach = $derived(await getCoach({ userId: user.id }));
	const team = $derived(
		coach?.teamId ? await getTeam({ id: coach.teamId, include: { players: true } }) : null
	);

	let player = $state({
		name: '',
		teamId: '',
		jerseyNumber: undefined,
	});

	$effect(() => {
		if (team?.id) {
			player.teamId = team.id;
		}
	});

	let hasPlayers = $derived(team?.players && team.players.length > 0);
	let submitting = $state(false);
</script>

<svelte:head>
	<title>Onboarding Coach {user.name} | {PUBLIC_APP_NAME}</title>
</svelte:head>

<div
	class="flex
	min-h-screen w-full
	items-center justify-center"
>
	<div class="flex w-full max-w-md flex-col">
		<h2 class="text-center text-muted-foreground">
			Step {COACH_STEPS.indexOf(currentStep) + 1} of {COACH_STEPS.length - 1}
		</h2>
		<!-- Use css grid so the layout doesn't shift when transitioning. -->
		<div class="grid grid-cols-1 grid-rows-1 overflow-hidden">
			{#if currentStep === 'create-team'}
				<SlideTransition
					class="col-start-1 row-start-1 flex w-full flex-col gap-6 justify-self-center px-8"
				>
					<SoloCoachTeamForm />
				</SlideTransition>
			{:else if currentStep === 'add-players' && team}
				<SlideTransition
					class="col-start-1 row-start-1 flex w-full flex-col gap-6 justify-self-center px-4"
				>
					<div class="flex flex-col gap-4">
						<div>
							<h1 class="text-center text-2xl font-bold">Add Players to {team.name}</h1>
							<p class="text-center text-muted-foreground">
								Add your players below. You can manage your roster and invite players and their
								families anytime after setup.
							</p>
						</div>
						<PlayerForm bind:player bind:submitting />
						<div>
							{#if hasPlayers}
								<ExpandTransition class="flex flex-col gap-6">
									<PlayerTable players={team.players} />
									<form {...completeOnboarding.for('done')} class="flex w-full justify-center">
										<SubmitButton
											{submitting}
											class="group w-1/2 transition-transform duration-300 hover:-translate-y-0.5"
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
									<form
										{...completeOnboarding.for('skip')}
										method="POST"
										class="flex w-full justify-center"
									>
										<SubmitButton
											variant="secondary"
											{submitting}
											class="group w-1/2
											transition-transform duration-300
											hover:-translate-y-0.5"
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
					</div>
				</SlideTransition>
			{/if}
		</div>
	</div>
</div>
