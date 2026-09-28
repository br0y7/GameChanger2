<script lang="ts">
	import { resolve } from '$app/paths';
	import { PUBLIC_APP_NAME } from '$env/static/public';
	import { getPublicPlayer } from '$lib/api/public-stats.remote';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();

	const player = $derived(
		await getPublicPlayer({
			orgSlug: params.orgSlug,
			seasonSlug: params.seasonSlug,
			playerId: params.playerId,
		})
	);

	const backHref = $derived(
		resolve('/(public)/leagues/[orgSlug]/[seasonSlug]', {
			orgSlug: params.orgSlug,
			seasonSlug: params.seasonSlug,
		})
	);
	const teamHref = $derived(
		resolve(
			`/(public)/leagues/[orgSlug]/[seasonSlug]?tab=players&division=${player.divisionSlug}&team=${player.teamSlug}`,
			{
				orgSlug: params.orgSlug,
				seasonSlug: params.seasonSlug,
			}
		)
	);
</script>

<svelte:head>
	<title>{player.name} | {PUBLIC_APP_NAME}</title>
</svelte:head>

<div
	class="mx-auto max-w-3xl px-4 py-12 sm:px-6"
	style="font-family: Figtree, system-ui, sans-serif"
>
	<a href={backHref} class="text-sm text-[#8FA398] hover:text-[#B8E05C]">← Season stats</a>
	<p class="mt-6 text-xs font-semibold tracking-[0.18em] text-[#8FA398] uppercase">Public stats</p>
	<h1
		class="mt-2 text-4xl font-bold tracking-tight text-[#E8F0EA]"
		style="font-family: 'Barlow Condensed', system-ui, sans-serif"
	>
		#{player.jerseyNumber}
		{player.name}
	</h1>
	<p class="mt-2 text-sm text-[#A8B8AE]">
		<a href={teamHref} class="font-medium text-[#E8F0EA] hover:text-[#B8E05C] hover:underline">
			{player.teamName}
		</a>
		· {player.divisionName}
	</p>
	<p class="mt-2 text-sm text-[#8FA398]">Season averages only. Development notes stay private.</p>

	{#if player.gp === 0}
		<p class="mt-8 text-sm text-[#8FA398]">No completed games yet.</p>
	{:else}
		<dl class="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-5">
			{#each [{ label: 'GP', value: player.gp }, { label: 'PPG', value: player.ppg }, { label: 'RPG', value: player.rpg }, { label: 'APG', value: player.apg }, { label: 'SPG', value: player.spg }] as stat (stat.label)}
				<div class="border border-white/10 bg-[#151D19] p-4">
					<dt class="text-xs font-semibold tracking-wide text-[#8FA398] uppercase">{stat.label}</dt>
					<dd class="mt-1 text-2xl font-bold text-[#B8E05C] tabular-nums">{stat.value}</dd>
				</div>
			{/each}
		</dl>
	{/if}
</div>
