<script lang="ts">
	import { getDivisions } from '$lib/api/division.remote';
	import { getSeasons } from '$lib/api/season.remote';
	import { Button } from '$lib/components/ui/button';
	import * as Table from '$lib/components/ui/table/index.js';
	import * as Accordion from '$lib/components/ui/accordion/index.js';
	import type { Division, Season, Organization } from '$lib/server/db/schema';
	import { previewSpreadsheet, savePreview } from '$lib/api/preview.remote';
	import { Input } from '$lib/components/ui/input';
	import * as Field from '$lib/components/ui/field/index.js';
	import SubmitButton from '$lib/components/SubmitButton.svelte';
	import UploadIcon from '@lucide/svelte/icons/upload';
	import FieldErrorList from '$lib/components/FieldErrorList.svelte';
	import PreviewAccordion from './PreviewAccordion.svelte';
	import { onMount, untrack } from 'svelte';
	import { mergeImportedGames } from '$lib/import/game-identity';
	import type { GamePreview, SpreadsheetPreview } from '$lib/schemas/preview';
	import { toast } from 'svelte-sonner';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import { requireAdmin } from '$lib/api/auth.remote';
	import { getOrganization } from '$lib/api/organization.remote';
	import type { PageProps } from './$types';
	import { resolve } from '$app/paths';
	import { PUBLIC_APP_NAME } from '$env/static/public';

	await requireAdmin();

	let { params }: PageProps = $props();

	const org = $derived(await getOrganization({ slug: params.orgSlug }));
	const isLeagueOrg = $derived(org.type === 'league');

	interface Selected {
		season: (Season & { organization?: Organization | null }) | null;
		division: Division | null;
	}

	const selected: Selected = $state({
		season: null,
		division: null,
	});

	let submitting = $derived(!!previewSpreadsheet.pending);
	let saveFailures = $state<string[]>([]);

	let activeItem: 'season' | 'division' | 'upload' | 'preview' = $state('season');
	let divisions = $state<Division[]>([]);
	let divisionListReady = $state(false);

	// Resolved before the season panel opens, so the accordion measures the full list.
	const seasonList = $derived(
		await getSeasons({
			organizationId: org.type === 'league' ? org.id : undefined,
			include: { organization: org.type !== 'league' },
		})
	);
	let stagedGames = $state<GamePreview[]>([]);
	let mergedResult: SpreadsheetPreview | undefined;
	let stagedDivisionId = $state<string | null>(null);

	let timeZone = $state('');
	onMount(() => {
		timeZone = new Intl.DateTimeFormat().resolvedOptions().timeZone;
	});

	$effect(() => {
		const divisionId = selected.division?.id ?? null;
		if (divisionId === stagedDivisionId) return;
		stagedDivisionId = divisionId;
		stagedGames = [];
		mergedResult = previewSpreadsheet.result;
	});

	$effect(() => {
		const result = previewSpreadsheet.result;
		if (!result || result === mergedResult) return;
		mergedResult = result;
		const incoming = result.games;
		const kept = untrack(() => stagedGames);
		stagedGames = mergeImportedGames(kept, incoming, timeZone);
	});

	const preview = $derived<SpreadsheetPreview | undefined>(
		stagedGames.length > 0 ? { version: 'v1', games: stagedGames } : undefined
	);

	function clearStagedGames() {
		stagedGames = [];
		mergedResult = previewSpreadsheet.result;
	}

	async function chooseSeason(season: (typeof seasonList)[number]) {
		selected.season = season;
		selected.division = null;
		divisionListReady = false;
		clearStagedGames();
		divisions = await getDivisions({ seasonId: season.id });
		divisionListReady = true;
		activeItem = 'division';
	}

	function failureLines(err: unknown): string[] {
		const message =
			err && typeof err === 'object' && 'body' in err
				? String((err as { body?: { message?: string } }).body?.message ?? '')
				: err instanceof Error
					? err.message
					: String(err);
		const lines = message
			.split('\n')
			.map((line) => line.trim())
			.filter((line) => line.length > 0);
		return lines.length > 0 ? lines : ['The statsheet could not be saved.'];
	}

	async function savePreviewToDb() {
		try {
			submitting = true;
			saveFailures = [];
			if (!preview || !selected.division) {
				return;
			}

			await savePreview({
				games: preview.games,
				divisionId: selected.division.id,
				timeZone,
			});

			clearStagedGames();

			toast.success('Preview saved. Games missing from this statsheet were removed.');
		} catch (err) {
			saveFailures = failureLines(err);
			toast.error(
				saveFailures.length === 1
					? saveFailures[0]
					: `Couldn't save the statsheet. ${saveFailures.length} problems.`,
				{ duration: 12000 }
			);
		} finally {
			submitting = false;
		}
	}
</script>

<svelte:head>
	<title>Import Stats | {PUBLIC_APP_NAME}</title>
</svelte:head>

<section class="flex min-h-svh flex-col items-center gap-6 bg-background p-6 md:p-10">
	<h1 class="text-2xl font-bold">
		Import Stat Spreadsheet
		{#if isLeagueOrg}
			for {org.name}
		{/if}
	</h1>
	<p>Upload stats spreadsheet for a division, see a preview, then save to the database.</p>
	{#each [seasonList] as seasons (org.id)}
		<Accordion.Root type="single" bind:value={activeItem} class="max-w-xl">
			<Accordion.Item value="season">
				<Accordion.Trigger class="text-lg">
					Select a Season: {[selected.season?.name, selected.season?.organization?.name].join(
						' - '
					)}
				</Accordion.Trigger>
				<Accordion.Content>
					{#if seasons.length > 0}
						<Table.Root class="w-full table-fixed">
							<Table.Header>
								<Table.Row>
									<Table.Head class="w-2/5">Season Name</Table.Head>
									{#if !isLeagueOrg}
										<Table.Head class="w-2/5">Organization</Table.Head>
									{/if}
									<Table.Head class="w-1/5"></Table.Head>
								</Table.Row>
							</Table.Header>
							<Table.Body>
								{#each seasons as season (season.id)}
									<Table.Row>
										<Table.Cell class="truncate font-medium">{season.name}</Table.Cell>
										{#if !isLeagueOrg}
											<Table.Cell class="truncate">{season.organization?.name}</Table.Cell>
										{/if}
										<Table.Cell class="text-end">
											<Button type="button" onclick={() => chooseSeason(season)} variant="outline"
												>Select</Button
											>
										</Table.Cell>
									</Table.Row>
								{/each}
							</Table.Body>
						</Table.Root>
					{:else}
						<div class="flex flex-col text-center">
							<p class="my-0 py-0 text-lg">No seasons yet...</p>
							{#if isLeagueOrg}
								<p class="text-sm text-muted-foreground">
									Manage seasons in the
									<a
										href={resolve('/dashboard/[orgSlug]/seasons', { orgSlug: params.orgSlug })}
										class="underline underline-offset-4 hover:text-foreground"
									>
										Seasons page
									</a>.
								</p>
							{/if}
						</div>
					{/if}
				</Accordion.Content>
			</Accordion.Item>

			<Accordion.Item value="division" disabled={!divisionListReady}>
				<Accordion.Trigger class="text-lg">
					Select a Division: {selected.division?.name}
				</Accordion.Trigger>
				<Accordion.Content>
					{#if selected.season}
						{#if divisions.length > 0}
							<Table.Root>
								<Table.Header>
									<Table.Row>
										<Table.Head class="w-3/4">Division Name</Table.Head>
										<Table.Head class="w-1/4"></Table.Head>
									</Table.Row>
								</Table.Header>
								<Table.Body>
									{#each divisions as division (division.id)}
										<Table.Row>
											<Table.Cell class="font-medium">{division.name}</Table.Cell>
											<Table.Cell class="text-end">
												<Button
													type="button"
													onclick={() => {
														selected.division = division;
														activeItem = 'upload';
														clearStagedGames();
													}}
													variant="outline">Select</Button
												>
											</Table.Cell>
										</Table.Row>
									{/each}
								</Table.Body>
							</Table.Root>
						{:else}
							<div class="flex flex-col text-center">
								<p class="my-0 py-0 text-lg">No divisions yet...</p>
								{#if isLeagueOrg}
									<p class="text-sm text-muted-foreground">
										Manage divisions in the
										<a
											href={resolve('/dashboard/[orgSlug]/seasons/[seasonSlug]', {
												orgSlug: params.orgSlug,
												seasonSlug: selected.season.slug,
											})}
											class="underline underline-offset-4 hover:text-foreground"
										>
											{selected.season.name} page
										</a>.
									</p>
								{/if}
							</div>
						{/if}
					{/if}
				</Accordion.Content>
			</Accordion.Item>

			<Accordion.Item value="upload" disabled={!selected.division}>
				<Accordion.Trigger class="text-lg">
					Upload Spreadsheet for {selected.division?.name ?? '?'}
				</Accordion.Trigger>
				<Accordion.Content>
					{#if selected.division}
						<form
							{...previewSpreadsheet.enhance(async (form) => {
								saveFailures = [];
								if (await form.submit()) {
									activeItem = 'preview';
								}
							})}
							enctype="multipart/form-data"
						>
							<Field.Set disabled={submitting} class="px-1">
								<Field.Description
									>Upload a xlsx spreadsheet for {selected.division.name}</Field.Description
								>
								<Field.Group>
									<Field.Field>
										<input {...previewSpreadsheet.fields.version.as('hidden', 'v1')} />
										<input
											{...previewSpreadsheet.fields.divisionId.as('hidden', selected.division.id)}
										/>
										<Input {...previewSpreadsheet.fields.spreadsheet.as('file')} />
										<FieldErrorList errors={previewSpreadsheet.fields.spreadsheet.issues()} />
									</Field.Field>
									<Field.Field>
										<Field.Label for="time-zone">Time Zone:</Field.Label>
										<Input
											{...previewSpreadsheet.fields.timeZone.as('text', timeZone)}
											bind:value={timeZone}
											id="time-zone"
										/>
										<FieldErrorList errors={previewSpreadsheet.fields.timeZone.issues()} />
									</Field.Field>
									<Field.Field class="flex w-full items-center">
										<SubmitButton {submitting} class="max-w-xs">
											{#snippet icon()}
												<UploadIcon />
											{/snippet}
											Upload for Preview
										</SubmitButton>
									</Field.Field>
									<Field.Field>
										<FieldErrorList errors={previewSpreadsheet.fields.issues()} />
									</Field.Field>
								</Field.Group>
							</Field.Set>
						</form>
					{/if}
				</Accordion.Content>
			</Accordion.Item>

			<Accordion.Item value="preview" disabled={!(preview && selected.division?.id)}>
				<Accordion.Trigger class="text-lg">Preview</Accordion.Trigger>
				<Accordion.Content>
					{#if preview && selected.division}
						<p class="mb-3 text-sm text-muted-foreground">
							Games already saved stay in the league. A team that is not in this file, such as one
							from an earlier upload, is not removed. Uploading the same teams on a new date adds
							another game.
						</p>
						{#if saveFailures.length > 0}
							<Alert.Root variant="destructive" class="mb-4">
								<Alert.Title>Could not save this statsheet</Alert.Title>
								<Alert.Description>
									<ul class="list-disc space-y-1 pl-4">
										{#each saveFailures as line, index (index)}
											<li>{line}</li>
										{/each}
									</ul>
								</Alert.Description>
							</Alert.Root>
						{/if}
						<PreviewAccordion {preview} />
						<div class="flex w-full items-center justify-center">
							<SubmitButton onclick={savePreviewToDb} {submitting} class="min-w-xs">
								{#snippet icon()}
									<UploadIcon />
								{/snippet}
								Save to Database
							</SubmitButton>
						</div>
					{/if}
				</Accordion.Content>
			</Accordion.Item>
		</Accordion.Root>
	{/each}
</section>
