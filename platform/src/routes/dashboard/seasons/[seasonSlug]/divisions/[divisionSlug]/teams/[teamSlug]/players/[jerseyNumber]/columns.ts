import { renderComponent } from '$lib/components/ui/data-table';
import { type PlayerGameStat, type RawStatKey, type WithGame } from '$lib/schemas/player-game-stat';
import type { ColumnDef, Column } from '@tanstack/table-core';
import SortableStatHeader from './SortableStatHeader.svelte';

const someStatKeys: RawStatKey[] = ['ast', 'stl', 'blk', 'tov', 'pf'] as const;

export const columns: ColumnDef<WithGame<PlayerGameStat>>[] = [
	{
		accessorFn: (stats) => {
			return stats.game?.name ?? 'Unknown Game';
		},
		header: 'Game',
	},
	{
		accessorKey: 'pts',
		header: ({ column }) =>
			renderComponent(SortableStatHeader, {
				header: 'PTS',
				onclick: column.getToggleSortingHandler(),
			}),
	},
	{
		accessorKey: 'fgm',
		header: ({ column }) =>
			renderComponent(SortableStatHeader, {
				header: 'FGM',
				onclick: column.getToggleSortingHandler(),
			}),
	},
	{
		accessorKey: 'fga',
		header: ({ column }) =>
			renderComponent(SortableStatHeader, {
				header: 'FGA',
				onclick: column.getToggleSortingHandler(),
			}),
	},
	{
		accessorKey: 'fgPct',
		header: ({ column }) =>
			renderComponent(SortableStatHeader, {
				header: 'FG_PCT',
				onclick: column.getToggleSortingHandler(),
			}),
		cell: ({ row }) => {
			const numberFormatter = new Intl.NumberFormat('en', {
				style: 'decimal',
				maximumFractionDigits: 0,
			});

			return `${numberFormatter.format(row.original.fgPct * 100)}%`;
		},
	},
	{
		accessorKey: 'fg3m',
		header: ({ column }) =>
			renderComponent(SortableStatHeader, {
				header: 'FG3M',
				onclick: column.getToggleSortingHandler(),
			}),
	},
	{
		accessorKey: 'fg3a',
		header: ({ column }) =>
			renderComponent(SortableStatHeader, {
				header: 'FG3A',
				onclick: column.getToggleSortingHandler(),
			}),
	},
	{
		accessorKey: 'fg3Pct',
		header: ({ column }) =>
			renderComponent(SortableStatHeader, {
				header: 'FG3_PCT',
				onclick: column.getToggleSortingHandler(),
			}),
		cell: ({ row }) => {
			const numberFormatter = new Intl.NumberFormat('en', {
				style: 'decimal',
				maximumFractionDigits: 1,
			});

			return `${numberFormatter.format(row.original.fg3Pct * 100)}%`;
		},
	},
	{
		accessorKey: 'ftm',
		header: ({ column }) =>
			renderComponent(SortableStatHeader, {
				header: 'FTM',
				onclick: column.getToggleSortingHandler(),
			}),
	},
	{
		accessorKey: 'fta',
		header: ({ column }) =>
			renderComponent(SortableStatHeader, {
				header: 'FTA',
				onclick: column.getToggleSortingHandler(),
			}),
	},
	{
		accessorKey: 'ftPct',
		header: ({ column }) =>
			renderComponent(SortableStatHeader, {
				header: 'FT_PCT',
				onclick: column.getToggleSortingHandler(),
			}),
		cell: ({ row }) => {
			const numberFormatter = new Intl.NumberFormat('en', {
				style: 'decimal',
				maximumFractionDigits: 0,
			});

			return `${numberFormatter.format(row.original.ftPct * 100)}%`;
		},
	},
	...someStatKeys.map((key) => ({
		accessorKey: key,
		header: ({ column }: { column: Column<WithGame<PlayerGameStat>, unknown> }) =>
			renderComponent(SortableStatHeader, {
				header: key.toUpperCase(),
				onclick: column.getToggleSortingHandler(),
			}),
	})),
	{
		accessorKey: 'reb',
		header: ({ column }) =>
			renderComponent(SortableStatHeader, {
				header: 'REB',
				onclick: column.getToggleSortingHandler(),
			}),
	},
	{
		accessorKey: 'oreb',
		header: ({ column }) =>
			renderComponent(SortableStatHeader, {
				header: 'OREB',
				onclick: column.getToggleSortingHandler(),
			}),
	},
	{
		accessorKey: 'dreb',
		header: ({ column }) =>
			renderComponent(SortableStatHeader, {
				header: 'DREB',
				onclick: column.getToggleSortingHandler(),
			}),
	},
	{
		accessorKey: 'eff',
		header: ({ column }) =>
			renderComponent(SortableStatHeader, {
				header: 'EFF',
				onclick: column.getToggleSortingHandler(),
			}),
	},
];
