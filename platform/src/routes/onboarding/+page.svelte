<script lang="ts">
	import * as Alert from '$lib/components/ui/alert';
	import WarningIcon from '@lucide/svelte/icons/triangle-alert';
	import CheckIcon from '@lucide/svelte/icons/check';
	import OnboardingCard from './OnboardingCard.svelte';
	import { PUBLIC_APP_NAME } from '$env/static/public';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let name = $derived(data.user.name);

	const coachFeatures = [
		'Create and customize a team roster',
		'Invite players and manage profiles',
		'Track performance analytics and game stats',
	];

	const organizerFeatures = [
		'Set up your league and launch seasons',
		'Invite coaches and track teams',
		'View league-wide standings and schedules',
	];
</script>

<svelte:head>
	<title>Onboarding {name} | {PUBLIC_APP_NAME}</title>
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
				Welcome, <span class="text-primary">{name}</span>
			</h1>
			<p class="text-muted-foreground text-base max-w-md mx-auto">
				Choose how you want to get started.
			</p>
		</div>
		<div class="grid gap-6 md:grid-cols-2">
			<OnboardingCard
				title="I'm a Coach"
				description="Manage your roster and track team stats."
				callToAction="Create your Roster"
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

		<Alert.Root variant="no-border" class="flex flex-col items-center text-center">
			<div class="flex gap-2">
				<WarningIcon class="size-6 stroke-warning" />
				<Alert.Title class="text-base text-warning-foreground">Player, Parent, or Fan?</Alert.Title>
			</div>
			<Alert.Description>
				You need an invite link to join. Check your email for an invitation, or ask your coach or
				organizer for access.
			</Alert.Description>
		</Alert.Root>
	</div>
</div>
