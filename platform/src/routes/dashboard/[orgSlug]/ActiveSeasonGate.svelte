<script lang="ts">
	import { resolve } from '$app/paths';
	import {
		getCurrentSeason,
		getSeasons,
		setActiveSeason,
	} from '$lib/api/season.remote';

	interface Props {
		organizationId: string;
		orgSlug: string;
	}

	let { organizationId, orgSlug }: Props = $props();

	const currentSeason = $derived(await getCurrentSeason({ organizationId }));
	const seasons = $derived(await getSeasons({ organizationId }));
	const suggestedSeason = $derived(
		[...seasons].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] ?? null
	);

	let settingActive = $state(false);

	async function activateSeason(seasonId: string) {
		settingActive = true;
		try {
			await setActiveSeason({ seasonId, organizationId });
			await Promise.all([
				getCurrentSeason({ organizationId }).refresh(),
				getSeasons({ organizationId }).refresh(),
			]);
		} finally {
			settingActive = false;
		}
	}
</script>

{#if !currentSeason}
	<div class="rounded-2xl border border-[#F0A020]/40 bg-[#161B22] p-5 sm:p-6">
		{#if suggestedSeason}
			<p class="text-xs font-semibold tracking-wide text-[#F0A020] uppercase">No active season</p>
			<p class="mt-2 text-sm text-[#E6EDF3]">
				{suggestedSeason.name} exists but is not currently active. Set it active to manage teams,
				players, and games.
			</p>
			<button
				type="button"
				class="mt-4 inline-flex items-center rounded-md bg-[#F0A020] px-3 py-2 text-sm font-semibold text-[#0D1117] disabled:opacity-60"
				disabled={settingActive}
				onclick={() => activateSeason(suggestedSeason.id)}
			>
				{settingActive ? 'Setting…' : `Set ${suggestedSeason.name} as Active`}
			</button>
		{:else}
			<p class="text-sm text-[#E6EDF3]">No seasons yet.</p>
			<a
				href={resolve('/dashboard/[orgSlug]/seasons', { orgSlug })}
				class="mt-4 inline-flex items-center rounded-md bg-[#58A6FF] px-3 py-2 text-sm font-semibold text-[#0D1117]"
			>
				Create a season
			</a>
		{/if}
	</div>
{/if}
