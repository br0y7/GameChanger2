<script lang="ts">
	import * as Alert from '$lib/components/ui/alert';
	import WarningIcon from '@lucide/svelte/icons/triangle-alert';
	import CheckIcon from '@lucide/svelte/icons/check';
	import OnboardingCard from './OnboardingCard.svelte';
	import { PUBLIC_APP_NAME } from '$env/static/public';
	import { requireUser } from '$lib/api/auth.remote';
	import { startAwaitingInvite } from '$lib/api/onboarding.remote';
	import SubmitButton from '$lib/components/SubmitButton.svelte';

	const user = await requireUser();

	const coachFeatures = [
		'Join a league team with an invite link',
		'Manage roster and track team stats',
		'Review games and player development',
	];

	const organizerFeatures = [
		'Set up your league and launch seasons',
		'Invite coaches and track teams',
		'View league-wide standings and schedules',
	];

	let familyPending = $derived(!!startAwaitingInvite.pending);
</script>

<svelte:head>
	<title>Onboarding {user.name} | {PUBLIC_APP_NAME}</title>
</svelte:head>

<div
	class="flex
	min-h-screen w-full
	items-center justify-center
	p-4 md:p-8 bg-background"
>
	<div class="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4">
		<div class="text-center space-y-1">
			<h1 class="text-4xl font-extrabold tracking-tight">
				Welcome, <span class="text-primary">{user.name}</span>
			</h1>
			<p class="text-muted-foreground text-base max-w-md mx-auto">
				Choose how you want to get started. Coaches and families join with an invite — you won’t be
				on a team until you accept one.
			</p>
		</div>
		<div class="grid gap-6 md:grid-cols-2">
			<OnboardingCard
				title="I'm a Coach"
				description="Wait for a league invite, then open your Coach Portal."
				callToAction="Continue as Coach"
				role="coach"
			>
				<ul class="space-y-2 text-sm text-muted-foreground">
					{#each coachFeatures as feature (feature)}
						<li class="flex items-center gap-1">
							<CheckIcon class="size-4 stroke-success" />
							<span>
								{feature}
							</span>
						</li>
					{/each}
				</ul>
			</OnboardingCard>
			<OnboardingCard
				title="I'm a League Organizer"
				description="Manage your seasons, teams, and games."
				callToAction="Create your League"
				role="organizer"
			>
				<ul class="space-y-2 text-sm text-muted-foreground">
					{#each organizerFeatures as feature (feature)}
						<li class="flex items-center gap-1">
							<CheckIcon class="size-4 stroke-success" />
							<span>
								{feature}
							</span>
						</li>
					{/each}
				</ul>
			</OnboardingCard>
		</div>

		<form class="flex justify-center" {...startAwaitingInvite}>
			<input {...startAwaitingInvite.fields.role.as('hidden', 'player_follower')} />
			<Alert.Root variant="no-border" class="flex max-w-xl flex-col items-center text-center">
				<div class="flex gap-2">
					<WarningIcon class="size-6 stroke-warning" />
					<Alert.Title class="text-base text-warning-foreground">Player, Parent, or Fan?</Alert.Title>
				</div>
				<Alert.Description class="mb-3">
					You need an invite link to join a player. Continue here, then open the link from your
					email when it arrives.
				</Alert.Description>
				<SubmitButton submitting={familyPending}>Continue as Player / Family</SubmitButton>
			</Alert.Root>
		</form>
	</div>
</div>
