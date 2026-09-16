<script lang="ts">
	import SubmitButton from '$lib/components/SubmitButton.svelte';
	import ErrorAlert from '$lib/components/ErrorAlert.svelte';
	import {
		getLeagueVisibilitySettings,
		updateLeagueVisibility,
	} from '$lib/api/public-stats.remote';
	import { focusFirstError } from '$lib/forms/enhance';

	let { organizationId }: { organizationId: string } = $props();

	const settings = $derived(await getLeagueVisibilitySettings({ organizationId }));

	let submitting = $derived(!!updateLeagueVisibility.pending);
	let saved = $state(false);

	const toggles = [
		{ key: 'isListed' as const, label: 'List league on public discovery pages' },
		{ key: 'publishStandings' as const, label: 'Publish league standings' },
		{ key: 'publishGameScores' as const, label: 'Publish game scores' },
		{ key: 'publishTeamStats' as const, label: 'Publish team stats' },
		{ key: 'publishPlayerStats' as const, label: 'Publish player stats' },
		{ key: 'showPlayerFullNames' as const, label: 'Show player full names' },
		{ key: 'showPlayerPhotos' as const, label: 'Show player photos' },
		{ key: 'showBirthdate' as const, label: 'Show age / birthdate' },
	];

	$effect(() => {
		updateLeagueVisibility.fields.set({
			organizationId,
			...settings,
			publishDevelopmentReports: false,
		});
	});
</script>

<section class="rounded-xl border border-[#2A3038] bg-[#161B22] p-5 text-[#E6EDF3] sm:p-6">
	<h2 class="text-sm font-semibold tracking-wide text-[#8B949E] uppercase">
		Public Visibility Settings
	</h2>
	<p class="mt-1 text-sm text-[#8B949E]">
		Control what visitors can see without logging in. Development reports and coach feedback are
		never published.
	</p>

	<form
		class="mt-5 space-y-3"
		{...updateLeagueVisibility.enhance(async ({ submit }) => {
			saved = false;
			if (await submit()) {
				saved = true;
				await getLeagueVisibilitySettings({ organizationId }).refresh();
				setTimeout(() => (saved = false), 2500);
			}
		})}
		{@attach focusFirstError({
			submitting,
			issues: updateLeagueVisibility.fields.allIssues(),
		})}
	>
		<input {...updateLeagueVisibility.fields.organizationId.as('hidden', organizationId)} />
		<input {...updateLeagueVisibility.fields.publishDevelopmentReports.as('hidden', false)} />

		{#each toggles as toggle (toggle.key)}
			{@const field = updateLeagueVisibility.fields[toggle.key]}
			<label class="flex items-center justify-between gap-4 border-b border-[#2A3038]/80 py-2.5">
				<span class="text-sm">{toggle.label}</span>
				<input
					type="checkbox"
					class="size-4 accent-[#58A6FF]"
					{...field.as('checkbox')}
					checked={settings[toggle.key]}
				/>
			</label>
		{/each}

		<p class="pt-2 text-xs text-[#8B949E]">
			Publish development reports: permanently OFF for families’ privacy.
		</p>

		<ErrorAlert errors={updateLeagueVisibility.fields.issues()} />
		<div class="flex items-center gap-3 pt-2">
			<SubmitButton {submitting}>Save visibility</SubmitButton>
			{#if saved}
				<span class="text-sm text-[#3FB950]">Saved</span>
			{/if}
		</div>
	</form>
</section>
