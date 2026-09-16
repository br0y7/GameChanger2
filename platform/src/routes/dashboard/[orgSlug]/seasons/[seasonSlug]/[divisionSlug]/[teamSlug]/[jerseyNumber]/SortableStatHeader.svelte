<script lang="ts">
	import type { ComponentProps } from 'svelte';
	import ArrowUpDownIcon from '@lucide/svelte/icons/arrow-up-down';
	import { Button } from '$lib/components/ui/button/index.js';
	import { getStatDefinition } from '$lib/stats/stat-definitions';

	let {
		variant = 'ghost',
		header,
		...restProps
	}: ComponentProps<typeof Button> & { header: string } = $props();

	const definition = $derived(getStatDefinition(header));
</script>

<Button {variant} size="xs" title={definition || undefined} {...restProps}>
	{header}
	<ArrowUpDownIcon />
</Button>
