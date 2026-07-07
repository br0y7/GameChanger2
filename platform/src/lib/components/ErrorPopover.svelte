<script lang="ts">
	import * as Popover from '$lib/components/ui/popover/index.js';
	import type { RemoteFormIssue } from '@sveltejs/kit';
	import ErrorIcon from '@lucide/svelte/icons/x';

	interface Props {
		anchor: HTMLElement | null;
		errors?: RemoteFormIssue[];
		title?: string;
	}
	let { anchor, errors, title = 'Error' }: Props = $props();
</script>

<Popover.Root open={(errors ?? []).length > 0}>
	<Popover.Content
		customAnchor={anchor}
		class="bg-error-foreground flex flex-col gap-0.5"
		role="alert"
		aria-live="assertive"
	>
		<div class="flex gap-1 items-center">
			<ErrorIcon class="stroke-error" aria-hidden="true" />
			<h4 class="font-bold text-error">{title}</h4>
		</div>
		{#each errors as error (error.message)}
			<p class="text-error">{error.message}</p>
		{/each}
	</Popover.Content>
</Popover.Root>
