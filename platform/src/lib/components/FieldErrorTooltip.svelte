<script lang="ts">
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';
	import type { RemoteFormField } from '@sveltejs/kit';
	import type { Snippet } from 'svelte';

	interface Props {
		children: Snippet;
		remoteField: RemoteFormField<string>;
		ref: HTMLElement | null;
	}
	let { ref, children, remoteField }: Props = $props();

	const hasErrors = $derived((remoteField.issues() ?? []).length > 0);
</script>

<Tooltip.Provider>
	<Tooltip.Root disabled={!hasErrors} open={hasErrors}>
		<Tooltip.Trigger>
			{@render children()}
		</Tooltip.Trigger>
		<Tooltip.Content customAnchor={ref} class="bg-error-foreground text-error">
			{#each remoteField.issues() as error (error)}
				{error.message}
			{/each}
		</Tooltip.Content>
	</Tooltip.Root>
</Tooltip.Provider>
