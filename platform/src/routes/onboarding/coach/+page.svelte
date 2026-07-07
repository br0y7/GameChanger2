<script lang="ts">
	import SlideContainer from '$lib/components/SlideContainer.svelte';
	import { COACH_STEPS, type CoachOnboardingStep } from '$lib/onboarding/steps';
	import SoloCoachTeamForm from './SoloCoachTeamForm.svelte';
	import PlayerForm from './PlayerForm.svelte';
	import SubmitButton from '$lib/components/SubmitButton.svelte';
	import Collapsible from '$lib/components/Collapsible.svelte';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import PlayerTable from './PlayerTable.svelte';
	import { getOnboardingWithUser } from '$lib/api/onboarding.remote';
	import { getCoachWithUser } from '$lib/api/coach.remote';
	import { requireUser } from '$lib/api/auth.remote';
	import { getTeam } from '$lib/api/team.remote';
	import { PUBLIC_APP_NAME } from '$env/static/public';

	const user = $derived(await requireUser());

	const onboarding = $derived(await getOnboardingWithUser({ id: user.id }));
	let currentStep = $derived(onboarding.currentStep as CoachOnboardingStep);

	const coach = $derived(await getCoachWithUser({ id: user.id }));
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
	<div class="flex flex-col w-full max-w-md">
		<h2 class="text-center text-muted-foreground">
			Step {COACH_STEPS.indexOf(currentStep) + 1} of {COACH_STEPS.length - 1}
		</h2>
		<!-- Use css grid so the layout doesn't shift when transitioning. -->
		<div class="grid grid-cols-1 grid-rows-1 overflow-hidden">
			{#if currentStep === 'create-team'}
				<SlideContainer class="col-start-1 row-start-1 flex flex-col gap-6">
					<SoloCoachTeamForm />
				</SlideContainer>
			{:else if currentStep === 'add-players' && team}
				<SlideContainer class="col-start-1 row-start-1 flex flex-col gap-6">
					<div class="flex flex-col gap-4">
						<div>
							<h1 class="text-2xl font-bold text-center">Add Players to {team.name}</h1>
							<p class="text-muted-foreground text-center">
								Add your players below and send invites so they can join your roster.
							</p>
						</div>
						<PlayerForm bind:player bind:submitting />
						<div>
							<Collapsible isOpen={hasPlayers} class="flex flex-col gap-6">
								<PlayerTable players={team.players} />
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
							<Collapsible isOpen={!hasPlayers}>
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
						</div>
					</div>
				</SlideContainer>
			{/if}
		</div>
	</div>
</div>
