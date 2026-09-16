<script lang="ts">
	import SubmitButton from '$lib/components/SubmitButton.svelte';
	import ErrorAlert from '$lib/components/ErrorAlert.svelte';
	import { clearLeagueLogo, uploadLeagueLogo } from '$lib/api/league.remote';
	import { getHomepageLeague, getOrganization } from '$lib/api/organization.remote';
	import { focusFirstError } from '$lib/forms/enhance';
	import type { Organization } from '$lib/server/db/auth-schema';

	let { league }: { league: Organization } = $props();

	let uploading = $derived(!!uploadLeagueLogo.pending);
	let clearing = $derived(!!clearLeagueLogo.pending);
	let preview = $state<string | null>(null);
	let savedLogo = $state<string | null | undefined>(undefined);
	let saved = $state(false);

	const currentLogo = $derived(preview ?? savedLogo ?? league.logo);

	async function refreshLeague() {
		await Promise.all([
			getOrganization({ slug: league.slug }).refresh(),
			getHomepageLeague().refresh(),
		]);
	}

	$effect(() => {
		uploadLeagueLogo.fields.set({ organizationId: league.id });
		clearLeagueLogo.fields.set({ organizationId: league.id });
	});
</script>

<section class="rounded-xl border border-[#2A3038] bg-[#161B22] p-5 text-[#E6EDF3] sm:p-6">
	<h2 class="text-sm font-semibold tracking-wide text-[#8B949E] uppercase">Homepage logo</h2>
	<p class="mt-1 text-sm text-[#8B949E]">
		Shown on the public homepage (right side of the hero). Admins only. Prefer
		<strong class="font-medium text-[#E6EDF3]">PNG</strong> or
		<strong class="font-medium text-[#E6EDF3]">WebP</strong> for a crisp logo (JPEG also works). Max
		2MB.
	</p>

	{#if currentLogo}
		<div class="mt-4 flex justify-center rounded-lg border border-[#2A3038] bg-[#0D1117] p-4">
			<img src={currentLogo} alt="{league.name} logo preview" class="max-h-40 w-auto object-contain" />
		</div>
	{/if}

	<form
		class="mt-4 space-y-3"
		enctype="multipart/form-data"
		{...uploadLeagueLogo.enhance(async ({ submit }) => {
			saved = false;
			const ok = await submit();
			if (ok) {
				saved = true;
				preview = null;
				savedLogo = uploadLeagueLogo.result?.logo ?? savedLogo;
				await refreshLeague();
				setTimeout(() => (saved = false), 2500);
			}
		})}
		{@attach focusFirstError({
			submitting: uploading,
			issues: uploadLeagueLogo.fields.allIssues(),
		})}
	>
		<input {...uploadLeagueLogo.fields.organizationId.as('hidden', league.id)} />
		<label class="block text-sm text-[#8B949E]">
			Logo file
			<input
				type="file"
				accept="image/png,image/webp,image/jpeg"
				class="mt-1 block w-full text-sm text-[#E6EDF3] file:mr-3 file:rounded-md file:border-0 file:bg-[#B8E05C] file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-[#0C1210]"
				{...uploadLeagueLogo.fields.logo.as('file')}
				onchange={(e) => {
					const file = (e.currentTarget as HTMLInputElement).files?.[0];
					if (preview) URL.revokeObjectURL(preview);
					preview = file ? URL.createObjectURL(file) : null;
				}}
			/>
		</label>
		<ErrorAlert errors={uploadLeagueLogo.fields.issues() ?? uploadLeagueLogo.fields.logo.issues()} />
		<div class="flex flex-wrap items-center gap-3">
			<SubmitButton submitting={uploading} class="max-w-sm">
				{currentLogo ? 'Replace logo' : 'Upload logo'}
			</SubmitButton>
			{#if saved}
				<span class="text-sm text-[#3FB950]">Saved</span>
			{/if}
		</div>
	</form>

	{#if currentLogo}
		<form
			class="mt-3"
			{...clearLeagueLogo.enhance(async ({ submit }) => {
				if (await submit()) {
					preview = null;
					savedLogo = null;
					await refreshLeague();
				}
			})}
		>
			<input {...clearLeagueLogo.fields.organizationId.as('hidden', league.id)} />
			<button
				type="submit"
				class="text-sm text-[#F85149] hover:underline disabled:opacity-50"
				disabled={clearing}
			>
				{clearing ? 'Removing…' : 'Remove logo'}
			</button>
		</form>
	{/if}
</section>
