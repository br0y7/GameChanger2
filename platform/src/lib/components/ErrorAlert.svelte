<script lang="ts">
	import type { RemoteFormIssue } from '@sveltejs/kit';
	import * as Alert from '$lib/components/ui/alert';
	import ErrorIcon from '@lucide/svelte/icons/circle-x';
	import ExpandTransition from './transitions/ExpandTransition.svelte';

	interface Props {
		title?: string;
		errors?: RemoteFormIssue[];
	}

	let { errors, title = 'Error' }: Props = $props();
</script>

{#if (errors ?? []).length > 0}
	<ExpandTransition>
		<Alert.Root variant="destructive">
			<ErrorIcon />
			<Alert.Title>{title}</Alert.Title>
			<Alert.Description>
				{#each errors as error (error.message)}
					<p>{error.message}</p>
				{/each}
			</Alert.Description>
		</Alert.Root>
	</ExpandTransition>
{/if}
