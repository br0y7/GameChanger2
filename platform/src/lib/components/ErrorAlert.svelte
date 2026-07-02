<script lang="ts">
	import type { RemoteFormIssue } from '@sveltejs/kit';
	import Collapsible from './Collapsible.svelte';
	import * as Alert from '$lib/components/ui/alert';
	import ErrorIcon from '@lucide/svelte/icons/circle-x';

	interface Props {
		title?: string;
		errors?: RemoteFormIssue[];
	}

	let { errors, title = 'Error' }: Props = $props();
</script>

<Collapsible isOpen={(errors ?? []).length > 0}>
	<Alert.Root variant="destructive">
		<ErrorIcon />
		<Alert.Title>{title}</Alert.Title>
		<Alert.Description>
			{#each errors as error (error.message)}
				<p>{error.message}</p>
			{/each}
		</Alert.Description>
	</Alert.Root>
</Collapsible>
