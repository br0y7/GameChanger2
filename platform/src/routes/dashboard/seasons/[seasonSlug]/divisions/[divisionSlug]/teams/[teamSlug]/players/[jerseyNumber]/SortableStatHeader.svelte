<script lang="ts">
	import type { ComponentProps } from 'svelte';
	import ArrowUpDownIcon from '@lucide/svelte/icons/arrow-up-down';
	import { Button } from '$lib/components/ui/button/index.js';

	let {
		variant = 'ghost',
		header,
		...restProps
	}: ComponentProps<typeof Button> & { header: string } = $props();
</script>

<Button {variant} size="xs" {...restProps}>
	{header}
	<ArrowUpDownIcon />
</Button>
