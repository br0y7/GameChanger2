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
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
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
	<Accordion.Root type="single" bind:value={activeItem} class="max-w-xl">
		<Accordion.Item value="season">
			<Accordion.Trigger class="text-lg">
				Select a Season: {[selected.season?.name, selected.season?.organization?.name].join(' - ')}
			</Accordion.Trigger>
			<Accordion.Content>
				{const seasons = await getSeasons({
					organizationId: isLeagueOrg ? org.id : undefined,
					include: { organization: !isLeagueOrg },
				})}
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

		<Accordion.Item value="division" disabled={!selected.season}>
			<Accordion.Trigger class="text-lg">
				Select a Division: {selected.division?.name}
			</Accordion.Trigger>
			<Accordion.Content>
				{#if selected.season}
					{const divisions = await getDivisions({ seasonId: selected.season.id })}
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
</section>
