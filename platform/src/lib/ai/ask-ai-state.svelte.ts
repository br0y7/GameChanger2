import type { AskAiContext } from './context';

export { resolveAskAiContext, type AskAiContext, type AskAiContextType } from './context';

/** Shared open/close state for the persistent Ask AI panel. */
export const askAiState = $state({
	open: false,
	draftPrompt: '',
});

export function openAskAi(prompt?: string) {
	if (prompt) askAiState.draftPrompt = prompt;
	askAiState.open = true;
}

export function closeAskAi() {
	askAiState.open = false;
}

/** Compatibility wrapper for existing call sites. */
export const askAiPanel = {
	get open() {
		return askAiState.open;
	},
	set open(value: boolean) {
		askAiState.open = value;
	},
	get draftPrompt() {
		return askAiState.draftPrompt;
	},
	set draftPrompt(value: string) {
		askAiState.draftPrompt = value;
	},
	openPanel(prompt?: string) {
		openAskAi(prompt);
	},
	closePanel() {
		closeAskAi();
	},
};

export function contextTitle(ctx: AskAiContext) {
	switch (ctx.type) {
		case 'team':
			return `Ask about ${ctx.label}`;
		case 'player':
			return `Ask about ${ctx.label}`;
		case 'game':
			return 'Analyze this game';
		case 'season':
			return 'Explain the standings';
		default:
			return 'Ask AI';
	}
}
