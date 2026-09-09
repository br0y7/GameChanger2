<script lang="ts">
	import type { PlayerGameStats, WithGame } from '$lib/schemas/player-game-stat';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';

	interface Props {
		stats: WithGame<PlayerGameStats>;
	}

	let { stats }: Props = $props();

	const label = $derived(stats.game?.name ?? 'Unknown Game');
	const href = $derived(
		stats.gameId && page.params.orgSlug && page.params.seasonSlug
			? resolve('/dashboard/[orgSlug]/seasons/[seasonSlug]/games/[gameId]', {
					orgSlug: page.params.orgSlug,
					seasonSlug: page.params.seasonSlug,
					gameId: stats.gameId,
				})
			: null
	);
</script>

{#if href}
	<a href={href} class="font-medium text-foreground hover:text-[#58A6FF] hover:underline">
		{label}
	</a>
{:else}
	{label}
{/if}
