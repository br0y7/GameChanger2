<script lang="ts">
	import { getDivisions } from '$lib/api/division.remote';
	import { getSeasons } from '$lib/api/season.remote';
	import { Button } from '$lib/components/ui/button';
	import * as Table from '$lib/components/ui/table/index.js';
	import * as Accordion from '$lib/components/ui/accordion/index.js';
	import type { Division } from '$lib/server/db/schema';
	import { previewSpreadsheet, savePreview } from '$lib/api/preview.remote';
	import { Input } from '$lib/components/ui/input';
	import * as Field from '$lib/components/ui/field/index.js';
	import SubmitButton from '$lib/components/SubmitButton.svelte';
	import UploadIcon from '@lucide/svelte/icons/upload';
	import FieldErrorList from '$lib/components/FieldErrorList.svelte';
	import PreviewAccordion from './PreviewAccordion.svelte';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';

	const seasons = $derived(await getSeasons({ include: { organization: true } }));

	interface Selected {
		season: (typeof seasons)[number] | null;
		division: Division | null;
	}

	const selected: Selected = $state({
		season: null,
		division: null,
	});

	let submitting = $derived(!!previewSpreadsheet.pending);

	let activeItem: 'season' | 'division' | 'upload' | 'preview' = $state('season');
	let preview = $derived(previewSpreadsheet.result);

	let timeZone = $state('');
	onMount(() => {
		timeZone = new Intl.DateTimeFormat().resolvedOptions().timeZone;
	});

	async function savePreviewToDb() {
		try {
			submitting = true;
			if (!preview || !selected.division) {
				return;
			}

			await savePreview({ games: preview.games, divisionId: selected.division.id });

			preview = undefined;

			toast.success('Preview saved to the database');
		} catch (err) {
			toast.error(`Error: ${err}`);
		} finally {
			submitting = false;
		}
	}
</script>

<section
	class="bg-background flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10"
>
	<h1 class="text-2xl font-bold">Import Stat Spreadsheet</h1>
	<p>Upload stats spreadsheet for a division, see a preview, then save to the database.</p>
	<Accordion.Root type="single" bind:value={activeItem} class="max-w-xl">
		<Accordion.Item value="season">
			<Accordion.Trigger class="text-lg">
				Select a Season: {[selected.season?.name, selected.season?.organization?.name].join(' - ')}
			</Accordion.Trigger>
			<Accordion.Content>
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head class="w-2/5">Season Name</Table.Head>
							<Table.Head class="w-2/5">Organization</Table.Head>
							<Table.Head class="w-1/5"></Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each seasons as season (season.id)}
							<Table.Row>
								<Table.Cell class="font-medium">{season.name}</Table.Cell>
								<Table.Cell>{season.organization?.name}</Table.Cell>
								<Table.Cell class="flex justify-end">
									<Button
										onclick={() => {
											selected.season = season;
											activeItem = 'division';
											preview = undefined;
										}}
										variant="outline">Select</Button
									>
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			</Accordion.Content>
		</Accordion.Item>

		<Accordion.Item value="division" disabled={!selected.season}>
			<Accordion.Trigger class="text-lg">
				Select a Division: {selected.division?.name}
			</Accordion.Trigger>
			<Accordion.Content>
				{#if selected.season}
					<Table.Root>
						<Table.Header>
							<Table.Row>
								<Table.Head class="w-3/4">Division Name</Table.Head>
								<Table.Head class="w-1/4"></Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each await getDivisions({ seasonId: selected.season.id }) as division (division.id)}
								<Table.Row>
									<Table.Cell class="font-medium">{division.name}</Table.Cell>
									<Table.Cell class="flex justify-end">
										<Button
											onclick={() => {
												selected.division = division;
												activeItem = 'upload';
												preview = undefined;
											}}
											variant="outline">Select</Button
										>
									</Table.Cell>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
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
								<Field.Field class="w-full flex items-center">
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
					<PreviewAccordion {preview} />
					<div class="w-full flex items-center justify-center">
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
</section>
