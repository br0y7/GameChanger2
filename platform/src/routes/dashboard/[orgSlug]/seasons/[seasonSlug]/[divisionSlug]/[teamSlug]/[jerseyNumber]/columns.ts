import { renderComponent } from '$lib/components/ui/data-table';
import {
	type PlayerGameStats,
	type RawStatKey,
	type WithGame,
} from '$lib/schemas/player-game-stat';
import type { ColumnDef, Column } from '@tanstack/table-core';
import SortableStatHeader from './SortableStatHeader.svelte';
import GameNameCell from './GameNameCell.svelte';

const someStatKeys: RawStatKey[] = ['stl', 'blk', 'tov', 'pf'] as const;

function percentCell(value: number, fractionDigits = 0) {
	const numberFormatter = new Intl.NumberFormat('en', {
		style: 'decimal',
		maximumFractionDigits: fractionDigits,
	});

	return `${numberFormatter.format(value * 100)}%`;
}

function sortableHeader(header: string, column: Column<WithGame<PlayerGameStats>, unknown>) {
	return renderComponent(SortableStatHeader, {
		header,
		onclick: column.getToggleSortingHandler(),
	});
}

export const columns: ColumnDef<WithGame<PlayerGameStats>>[] = [
	{
		accessorFn: (stats) => {
			return stats.game?.name ?? 'Unknown Game';
		},
		header: 'Game',
		cell: ({ row }) => renderComponent(GameNameCell, { stats: row.original }),
	},
	{
		accessorKey: 'pts',
		header: ({ column }) => sortableHeader('PTS', column),
	},
	{
		accessorKey: 'reb',
		header: ({ column }) => sortableHeader('REB', column),
	},
	{
		accessorKey: 'ast',
		header: ({ column }) => sortableHeader('AST', column),
	},
	{
		id: 'fg',
		accessorFn: (stats) => stats.fgm,
		header: ({ column }) => sortableHeader('FG', column),
		cell: ({ row }) => `${row.original.fgm}-${row.original.fga}`,
	},
	{
		id: 'fg3',
		accessorFn: (stats) => stats.fg3m,
		header: ({ column }) => sortableHeader('3P', column),
		cell: ({ row }) => `${row.original.fg3m}-${row.original.fg3a}`,
	},
	{
		id: 'ft',
		accessorFn: (stats) => stats.ftm,
		header: ({ column }) => sortableHeader('FT', column),
		cell: ({ row }) => `${row.original.ftm}-${row.original.fta}`,
	},
	{
		accessorKey: 'fgPct',
		header: ({ column }) => sortableHeader('FG%', column),
		cell: ({ row }) => percentCell(row.original.fgPct),
	},
	{
		accessorKey: 'fg3Pct',
		header: ({ column }) => sortableHeader('3P%', column),
		cell: ({ row }) => percentCell(row.original.fg3Pct, 1),
	},
	{
		accessorKey: 'ftPct',
		header: ({ column }) => sortableHeader('FT%', column),
		cell: ({ row }) => percentCell(row.original.ftPct),
	},
	...someStatKeys.map((key) => ({
		accessorKey: key,
		header: ({ column }: { column: Column<WithGame<PlayerGameStats>, unknown> }) =>
			sortableHeader(key.toUpperCase(), column),
	})),
	{
		accessorKey: 'oreb',
		header: ({ column }) => sortableHeader('OREB', column),
	},
	{
		accessorKey: 'dreb',
		header: ({ column }) => sortableHeader('DREB', column),
	},
	{
		accessorKey: 'eff',
		header: ({ column }) => sortableHeader('EFF', column),
	},
];
