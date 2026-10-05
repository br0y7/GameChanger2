<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { askAiPanel } from '$lib/ai/ask-ai-state.svelte';
	import {
		BREAKDOWN_BAR_FIELDS,
		breakdownBarWidth,
		developmentFocus,
		strongestCategory,
		type RatingBreakdown,
	} from '$lib/stats/game-rating';

	export type GameRatingDetailModel = {
		playerName: string;
		opponentName?: string;
		rating: number;
		meaning: string;
		points: number;
		rebounds: number;
		offensiveRebounds: number;
		assists: number;
		steals: number;
		blocks: number;
		turnovers: number;
		breakdown: RatingBreakdown | null;
	};

	let {
		open = $bindable(false),
		detail,
		mode = 'development',
		askAs = 'self',
	}: {
		open?: boolean;
		detail: GameRatingDetailModel | null;
		mode?: 'development' | 'public';
		askAs?: 'self' | 'player';
	} = $props();

	const strength = $derived(detail?.breakdown ? strongestCategory(detail.breakdown) : null);
	const focus = $derived(detail?.breakdown ? developmentFocus(detail.breakdown) : null);

	function askWhy() {
		if (!detail) return;
		const rating = detail.rating.toFixed(1);
		const question =
			askAs === 'self'
				? `Why did I get a ${rating} Game Rating?`
				: `Why did ${detail.playerName} get a ${rating} Game Rating?`;
		askAiPanel.openPanel(question);
		open = false;
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="border-[#2A3038] bg-[#161B22] text-[#E6EDF3] sm:max-w-md">
		{#if detail}
			<Dialog.Header>
				<Dialog.Title class="text-xl text-[#E6EDF3]">
					Game Rating: {detail.rating.toFixed(1)} — {detail.meaning}
				</Dialog.Title>
				<Dialog.Description class="text-[#8B949E]">
					{detail.playerName}
					{#if detail.opponentName}
						· vs {detail.opponentName}
					{/if}
				</Dialog.Description>
			</Dialog.Header>

			<p class="text-sm tabular-nums text-[#E6EDF3]">
				{detail.points} PTS · {detail.rebounds} REB · {detail.offensiveRebounds} OREB · {detail.assists}
				AST · {detail.steals} STL · {detail.blocks} BLK
			</p>

			{#if detail.breakdown}
				<div class="space-y-2">
					{#each BREAKDOWN_BAR_FIELDS as field (field.key)}
						{@const value = detail.breakdown[field.key]}
						{#if value}
							<div class="grid grid-cols-[7.5rem_1fr] items-center gap-3 text-sm">
								<p class="text-[#8B949E]">{field.label}</p>
								<div class="h-2 overflow-hidden rounded-full bg-[#2A3038]">
									<div
										class="h-full rounded-full bg-[#F0A020]"
										style="width: {breakdownBarWidth(value)}%"
									></div>
								</div>
							</div>
						{/if}
					{/each}
				</div>
			{/if}

			{#if mode === 'development' && detail.breakdown}
				<div class="space-y-2 text-sm">
					{#if strength}
						<p>
							<span class="text-[#8B949E]">Biggest strength:</span>
							{strength.label}
						</p>
					{/if}
					{#if focus}
						<p>
							<span class="text-[#8B949E]">Focus next game:</span>
							{focus.label}
						</p>
					{/if}
				</div>
				<button
					type="button"
					class="text-sm font-medium text-[#58A6FF] hover:underline"
					onclick={askWhy}
				>
					Ask GameChanger AI → {askAs === 'self'
						? `Why did I get ${detail.rating.toFixed(1)}?`
						: `Why did ${detail.playerName} get ${detail.rating.toFixed(1)}?`}
				</button>
			{/if}
		{/if}
	</Dialog.Content>
</Dialog.Root>
