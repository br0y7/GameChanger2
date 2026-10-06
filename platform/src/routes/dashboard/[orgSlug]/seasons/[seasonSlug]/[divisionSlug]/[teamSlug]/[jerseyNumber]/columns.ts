import { renderComponent } from '$lib/components/ui/data-table';
import { formatGameLogDate } from '$lib/schemas/game';
import {
	type PlayerGameStats,
	type RawStatKey,
	type WithGame,
} from '$lib/schemas/player-game-stat';
import type { ColumnDef, Column } from '@tanstack/table-core';
import SortableStatHeader from './SortableStatHeader.svelte';
import GameNameCell from './GameNameCell.svelte';
import GameTypeCell from './GameTypeCell.svelte';

const someStatKeys: RawStatKey[] = ['stl', 'blk', 'tov', 'pf'] as const;

function percentCell(value: number, fractionDigits = 0) {
	const numberFormatter = new Intl.NumberFormat('en', {
		style: 'decimal',
		maximumFractionDigits: fractionDigits,
	});

	return `${numberFormatter.format(value * 100)}%`;
}

/** Points-only sheets record the point total and leave the rest of the box blank. */
function boxCell(stats: WithGame<PlayerGameStats>, value: string | number) {
	return stats.pointsOnly ? '—' : value;
}

function sortableHeader(header: string, column: Column<WithGame<PlayerGameStats>, unknown>) {
	return renderComponent(SortableStatHeader, {
		header,
		onclick: column.getToggleSortingHandler(),
	});
}

export const columns: ColumnDef<WithGame<PlayerGameStats>>[] = [
	{
		id: 'date',
		accessorFn: (stats) => {
			const at = stats.game?.completedAt ?? stats.game?.scheduledAt;
			if (!at) return 0;
			return at instanceof Date ? at.getTime() : new Date(at).getTime();
		},
		header: ({ column }) => sortableHeader('Date', column),
		cell: ({ row }) =>
			formatGameLogDate(row.original.game?.completedAt ?? row.original.game?.scheduledAt),
	},
	{
		id: 'gameType',
		accessorFn: (stats) => stats.game?.gameType ?? 'regular',
		header: ({ column }) => sortableHeader('Type', column),
		cell: ({ row }) => renderComponent(GameTypeCell, { gameType: row.original.game?.gameType }),
	},
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
		cell: ({ row }) => boxCell(row.original, row.original.reb),
	},
	{
		accessorKey: 'ast',
		header: ({ column }) => sortableHeader('AST', column),
		cell: ({ row }) => boxCell(row.original, row.original.ast),
	},
	{
		id: 'fg',
		accessorFn: (stats) => stats.fgm,
		header: ({ column }) => sortableHeader('FG', column),
		cell: ({ row }) => boxCell(row.original, `${row.original.fgm}-${row.original.fga}`),
	},
	{
		id: 'fg3',
		accessorFn: (stats) => stats.fg3m,
		header: ({ column }) => sortableHeader('3P', column),
		cell: ({ row }) => boxCell(row.original, `${row.original.fg3m}-${row.original.fg3a}`),
	},
	{
		id: 'ft',
		accessorFn: (stats) => stats.ftm,
		header: ({ column }) => sortableHeader('FT', column),
		cell: ({ row }) => boxCell(row.original, `${row.original.ftm}-${row.original.fta}`),
	},
	{
		accessorKey: 'fgPct',
		header: ({ column }) => sortableHeader('FG%', column),
		cell: ({ row }) => boxCell(row.original, percentCell(row.original.fgPct)),
	},
	{
		accessorKey: 'fg3Pct',
		header: ({ column }) => sortableHeader('3P%', column),
		cell: ({ row }) => boxCell(row.original, percentCell(row.original.fg3Pct, 1)),
	},
	{
		accessorKey: 'ftPct',
		header: ({ column }) => sortableHeader('FT%', column),
		cell: ({ row }) => boxCell(row.original, percentCell(row.original.ftPct)),
	},
	...someStatKeys.map((key) => ({
		accessorKey: key,
		header: ({ column }: { column: Column<WithGame<PlayerGameStats>, unknown> }) =>
			sortableHeader(key.toUpperCase(), column),
		cell: ({ row }: { row: { original: WithGame<PlayerGameStats> } }) =>
			boxCell(row.original, row.original[key]),
	})),
	{
		accessorKey: 'oreb',
		header: ({ column }) => sortableHeader('OREB', column),
		cell: ({ row }) => boxCell(row.original, row.original.oreb),
	},
	{
		accessorKey: 'dreb',
		header: ({ column }) => sortableHeader('DREB', column),
		cell: ({ row }) => boxCell(row.original, row.original.dreb),
	},
	{
		accessorKey: 'eff',
		header: ({ column }) => sortableHeader('EFF', column),
		cell: ({ row }) => boxCell(row.original, row.original.eff),
	},
	{
		accessorKey: 'gameRating',
		header: ({ column }) => sortableHeader('Rating', column),
		cell: ({ row }) => (row.original.gameRating == null ? '—' : row.original.gameRating.toFixed(1)),
	},
];
