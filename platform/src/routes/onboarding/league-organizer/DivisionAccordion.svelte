<script lang="ts">
	import * as Accordion from '$lib/components/ui/accordion/index.js';
	import type { Division } from '$lib/server/db/schema';
	import DivisionAccordionItem from './DivisionAccordionItem.svelte';

	interface Props {
		divisions: Division[];
	}

	let { divisions }: Props = $props();
</script>

<h2 class="text-xl text-center font-bold">Divisions</h2>
<Accordion.Root type="single">
	{#each divisions as division (division.id)}
		<DivisionAccordionItem {division} />
	{/each}
</Accordion.Root>
