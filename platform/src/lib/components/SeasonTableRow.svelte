<script lang="ts">
	import * as Table from '$lib/components/ui/table/index.js';
	import type { Season } from '$lib/server/db/schema';
	import { fade } from 'svelte/transition';
	import ExpandTransition from './transitions/ExpandTransition.svelte';
	import { Badge } from './ui/badge';
	import { cubicOut } from 'svelte/easing';
	import { Button } from './ui/button';
	import PencilIcon from '@lucide/svelte/icons/pencil-line';
	import { resolve } from '$app/paths';
	import TrashIcon from '@lucide/svelte/icons/trash-2';
	import type { ActionVisibility } from './types';

	interface Props extends ActionVisibility {
		season: Season;
		onDelete: (season: Season) => void;
		onRequestEdit: (season: Season) => void;
		orgSlug: string;
	}

	let { season, onDelete, onRequestEdit, orgSlug, canEdit, canDelete }: Props = $props();

	const badgeVariant = $derived(season.status === 'active' ? 'info' : 'success');
	const fadeOptions = { duration: 200, easing: cubicOut };
</script>

<Table.Row>
	<Table.Cell>
		<ExpandTransition>
			<div in:fade={fadeOptions} class="truncate">
				<a
					href={resolve('/dashboard/[orgSlug]/seasons/[seasonSlug]', {
						orgSlug,
						seasonSlug: season.slug,
					})}
					class="underline"
				>
					{season.name}
				</a>
			</div>
		</ExpandTransition>
	</Table.Cell>
	<Table.Cell class="hidden sm:table-cell">
		<ExpandTransition>
			<div in:fade={fadeOptions} class="truncate">
				{season.slug}
			</div>
		</ExpandTransition>
	</Table.Cell>
	<Table.Cell>
		<ExpandTransition>
			<div in:fade={fadeOptions}>
				<Badge variant={badgeVariant}>
					{season.status}
				</Badge>
			</div>
		</ExpandTransition>
	</Table.Cell>
	{#if canEdit || canDelete}
		<Table.Cell>
			<ExpandTransition>
				<div in:fade={fadeOptions} class="flex justify-end">
					{#if canEdit}
						<Button onclick={() => onRequestEdit(season)} class="group" variant="ghost" size="icon">
							<PencilIcon class="transition-colors duration-200 group-hover:stroke-info" />
						</Button>
					{/if}
					{#if canDelete}
						<Button onclick={() => onDelete(season)} class="group" variant="ghost" size="icon">
							<TrashIcon class="transition-colors duration-200 group-hover:stroke-error" />
						</Button>
					{/if}
				</div>
			</ExpandTransition>
		</Table.Cell>
	{/if}
</Table.Row>
