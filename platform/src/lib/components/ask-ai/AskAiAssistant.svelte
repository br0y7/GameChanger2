<script lang="ts">
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button';
	import {
		askAiState,
		askAiThreads,
		closeAskAi,
		contextTitle,
		openAskAi,
		resolveAskAiContext,
		type AskAiAudience,
		type AskAiChatMessage,
	} from '$lib/ai/ask-ai-state.svelte';
	import { askAi, getAskAiContextLabel } from '$lib/api/ai-assistant.remote';
	import { isCoachOnlyUser } from '$lib/api/coach-nav.remote';
	import { isFamilyOnlyUser } from '$lib/api/family-nav.remote';
	import ArrowUpIcon from '@lucide/svelte/icons/arrow-up';
	import SparklesIcon from '@lucide/svelte/icons/sparkles';
	import XIcon from '@lucide/svelte/icons/x';

	let input = $state('');
	let submitting = $state(false);
	let resolvedLabel = $state<string | null>(null);
	let messagesEl: HTMLDivElement | null = $state(null);
	let lastContextKey = '';
	let audience = $state<AskAiAudience>('organizer');

	$effect(() => {
		let cancelled = false;
		void (async () => {
			try {
				const family = await isFamilyOnlyUser();
				if (cancelled) return;
				if (family) {
					audience = 'player';
					return;
				}
				const coach = await isCoachOnlyUser();
				if (cancelled) return;
				audience = coach ? 'coach' : 'organizer';
			} catch {
				/* keep organizer suggestions */
			}
		})();
		return () => {
			cancelled = true;
		};
	});

	const routeContext = $derived(
		resolveAskAiContext(
			Object.fromEntries(
				Object.entries(page.params).filter((entry): entry is [string, string] => !!entry[1])
			),
			page.url.pathname,
			audience
		)
	);

	const contextKey = $derived(
		[
			routeContext.type,
			routeContext.teamSlug ?? '',
			routeContext.jerseyNumber ?? '',
			routeContext.gameId ?? '',
			routeContext.seasonSlug ?? '',
			routeContext.playerId ?? '',
			routeContext.teamId ?? '',
		].join('|')
	);

	const messages = $derived(askAiThreads[contextKey] ?? []);

	const displayContext = $derived({
		...routeContext,
		label: resolvedLabel ?? routeContext.label,
	});

	$effect(() => {
		const key = contextKey;
		const ctx = routeContext;
		if (key === lastContextKey) return;
		lastContextKey = key;
		resolvedLabel = null;

		let cancelled = false;
		void (async () => {
			try {
				const result = await getAskAiContextLabel({
					type: ctx.type,
					orgSlug: ctx.orgSlug,
					seasonSlug: ctx.seasonSlug,
					divisionSlug: ctx.divisionSlug,
					teamSlug: ctx.teamSlug,
					jerseyNumber: ctx.jerseyNumber,
					gameId: ctx.gameId,
					playerId: ctx.playerId,
					teamId: ctx.teamId,
				});
				if (!cancelled && result.label) resolvedLabel = result.label;
			} catch {
				/* keep default label */
			}
		})();

		return () => {
			cancelled = true;
		};
	});

	$effect(() => {
		if (!askAiState.open) return;
		const draft = askAiState.draftPrompt;
		if (!draft) return;
		input = draft;
		askAiState.draftPrompt = '';
	});

	$effect(() => {
		void messages.length;
		void submitting;
		queueMicrotask(() => {
			if (messagesEl) messagesEl.scrollTop = messagesEl.scrollHeight;
		});
	});

	function clipHistory(turns: AskAiChatMessage[]) {
		return turns.slice(-8).map((turn) => ({
			role: turn.role,
			content: turn.content.length > 1500 ? `${turn.content.slice(0, 1500)}…` : turn.content,
		}));
	}

	function clearChat() {
		if (submitting) return;
		askAiThreads[contextKey] = [];
		input = '';
	}

	async function sendMessage(text: string) {
		const message = text.trim();
		if (!message || submitting) return;

		const key = contextKey;
		const history: AskAiChatMessage[] = [...(askAiThreads[key] ?? [])];
		askAiThreads[key] = [...history, { role: 'user', content: message }];
		input = '';
		submitting = true;

		try {
			const result = await askAi({
				message,
				history: clipHistory(history),
				context: {
					type: routeContext.type,
					orgSlug: routeContext.orgSlug,
					seasonSlug: routeContext.seasonSlug,
					divisionSlug: routeContext.divisionSlug,
					teamSlug: routeContext.teamSlug,
					jerseyNumber: routeContext.jerseyNumber,
					gameId: routeContext.gameId,
					playerId: routeContext.playerId,
					teamId: routeContext.teamId,
					audience,
				},
			});
			askAiThreads[key] = [...(askAiThreads[key] ?? []), { role: 'assistant', content: result.reply }];
		} catch {
			askAiThreads[key] = [
				...(askAiThreads[key] ?? []),
				{
					role: 'assistant',
					content: "Something went wrong talking to the assistant. Let's try that again.",
				},
			];
		} finally {
			submitting = false;
		}
	}

	function onSubmit(e: Event) {
		e.preventDefault();
		void sendMessage(input);
	}

	/** Split assistant (and user) text into paragraphs for readable spacing. */
	function messageParagraphs(content: string): string[] {
		const trimmed = content.trim();
		if (!trimmed) return [];

		const byBlankLine = trimmed
			.split(/\n\s*\n/)
			.map((p) => p.trim())
			.filter(Boolean);

		if (byBlankLine.length > 1) return byBlankLine;

		// Single block with hard line breaks → treat each non-empty line as a paragraph
		const byLine = trimmed
			.split('\n')
			.map((p) => p.trim())
			.filter(Boolean);
		if (byLine.length > 1) return byLine;

		// Long wall of text with no breaks → split on sentence ends into ~2–4 sentence chunks
		if (trimmed.length > 280) {
			const sentences = trimmed.match(/[^.!?]+[.!?]+(?:\s+|$)|[^.!?]+$/g) ?? [trimmed];
			const chunks: string[] = [];
			let current = '';
			for (const sentence of sentences) {
				const next = (current ? `${current} ${sentence.trim()}` : sentence.trim()).trim();
				if (current && next.length > 220) {
					chunks.push(current);
					current = sentence.trim();
				} else {
					current = next;
				}
			}
			if (current) chunks.push(current);
			if (chunks.length > 1) return chunks;
		}

		return [trimmed];
	}
</script>

{#if !askAiState.open}
	<button
		type="button"
		class="pointer-events-auto fixed right-5 bottom-5 z-[80] flex items-center gap-2 rounded-full bg-[#58A6FF] px-4 py-3 text-sm font-semibold text-[#0D1117] shadow-lg transition hover:bg-[#79b8ff] focus-visible:ring-2 focus-visible:ring-[#58A6FF] focus-visible:outline-none"
		onclick={() => openAskAi()}
		aria-label="Ask AI"
	>
		<span aria-hidden="true">✦</span>
		Ask AI
	</button>
{/if}

{#if askAiState.open}
	<button
		type="button"
		class="fixed inset-0 z-[80] bg-black/10"
		aria-label="Close AI assistant"
		onclick={() => closeAskAi()}
	></button>
	<div
		class="fixed inset-y-0 right-0 z-[90] flex h-full w-full flex-col border-l border-[#2A3038] bg-[#161B22] text-[#E6EDF3] shadow-lg sm:max-w-[400px]"
		role="dialog"
		aria-label="AI Assistant"
	>
			<header class="flex items-start justify-between border-b border-[#2A3038] px-5 py-4">
				<div>
					<p class="flex items-center gap-2 text-sm font-semibold text-[#E6EDF3]">
						<span class="text-[#58A6FF]" aria-hidden="true">✦</span>
						AI Assistant
					</p>
					<p class="mt-1 text-sm text-[#8B949E]">{contextTitle(displayContext)}</p>
				</div>
				<div class="flex items-center gap-1">
					{#if messages.length > 0}
						<Button
							variant="ghost"
							class="text-xs text-[#8B949E] hover:bg-white/10 hover:text-[#E6EDF3]"
							disabled={submitting}
							onclick={clearChat}
						>
							Clear
						</Button>
					{/if}
					<Button
						variant="ghost"
						size="icon"
						class="text-[#8B949E] hover:bg-white/10 hover:text-[#E6EDF3]"
						onclick={() => closeAskAi()}
						aria-label="Close AI assistant"
					>
						<XIcon class="size-4" />
					</Button>
				</div>
			</header>

			<div bind:this={messagesEl} class="flex-1 space-y-4 overflow-y-auto px-5 py-4">
				{#if messages.length === 0}
					<div>
						<p class="mb-2 text-xs font-semibold tracking-wide text-[#8B949E] uppercase">
							Suggested
						</p>
						<ul class="space-y-2">
							{#each displayContext.suggestions as suggestion (suggestion)}
								<li>
									<button
										type="button"
										class="w-full rounded-xl border border-[#2A3038] bg-[#0D1117] px-3 py-2.5 text-left text-sm text-[#E6EDF3] transition hover:border-[#58A6FF] hover:text-[#58A6FF] disabled:opacity-50"
										disabled={submitting}
										onclick={() => sendMessage(suggestion)}
									>
										{suggestion}
									</button>
								</li>
							{/each}
						</ul>
					</div>
				{:else}
					{#each messages as message, index (`${message.role}-${index}`)}
						<div
							class="rounded-xl px-3 py-2.5 text-sm leading-relaxed {message.role === 'user'
								? 'ml-6 bg-[#58A6FF]/10 text-[#E6EDF3]'
								: 'mr-2 border border-[#2A3038] bg-[#0D1117] text-[#E6EDF3]'}"
						>
							{#each messageParagraphs(message.content) as paragraph, pIndex (`${index}-p-${pIndex}`)}
								<p class={pIndex > 0 ? 'mt-3' : ''}>{paragraph}</p>
							{/each}
						</div>
					{/each}
					{#if submitting}
						<div
							class="mr-2 rounded-xl border border-[#2A3038] bg-[#0D1117] px-3 py-2.5 text-sm text-[#8B949E]"
						>
							Thinking…
						</div>
					{/if}
				{/if}
			</div>

			<form class="border-t border-[#2A3038] p-4" onsubmit={onSubmit}>
				<div class="flex items-end gap-2 rounded-xl border border-[#2A3038] bg-[#0D1117] p-2">
					<textarea
						bind:value={input}
						rows="2"
						placeholder="Ask anything..."
						disabled={submitting}
						class="max-h-28 min-h-[2.5rem] flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-[#E6EDF3] placeholder:text-[#8B949E] focus:outline-none disabled:opacity-50"
						onkeydown={(e) => {
							if (e.key === 'Enter' && !e.shiftKey) {
								e.preventDefault();
								void sendMessage(input);
							}
						}}
					></textarea>
					<Button
						type="submit"
						size="icon"
						disabled={submitting || !input.trim()}
						class="shrink-0 rounded-lg bg-[#58A6FF] text-[#0D1117] hover:bg-[#79b8ff]"
						aria-label="Send"
					>
						{#if submitting}
							<SparklesIcon class="size-4 animate-pulse" />
						{:else}
							<ArrowUpIcon class="size-4" />
						{/if}
					</Button>
				</div>
			</form>
	</div>
{/if}

<svelte:window
	onkeydown={(event) => {
		if (event.key === 'Escape' && askAiState.open) closeAskAi();
	}}
/>
