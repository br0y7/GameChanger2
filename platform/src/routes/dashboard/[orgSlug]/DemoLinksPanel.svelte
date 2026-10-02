<script lang="ts">
	import ClipboardIcon from '@lucide/svelte/icons/clipboard';
	import { createDemoLink, listDemoLinks, revokeDemoLink } from '$lib/api/demo.remote';
	import { listAllLeaguesForAdmin } from '$lib/api/organization.remote';
	import { demoExpiryDays, type DemoExpiryDays } from '$lib/schemas/demo';

	const leagues = $derived(await listAllLeaguesForAdmin());
	const links = $derived(await listDemoLinks());
	const activeLinks = $derived(links.filter((link) => link.active));

	let organizationId = $state('');
	let expiresInDays = $state<DemoExpiryDays>(14);
	let creating = $state(false);
	let copiedId = $state<string | null>(null);
	let createdUrl = $state<string | null>(null);
	let errorMessage = $state<string | null>(null);

	const selectClass =
		'w-full rounded-md border border-[#2A3038] bg-[#0D1117] px-3 py-2 text-sm text-[#E6EDF3] focus:border-[#58A6FF] focus:outline-none';

	async function copyUrl(id: string, url: string) {
		await navigator.clipboard.writeText(url);
		copiedId = id;
		window.setTimeout(() => {
			if (copiedId === id) copiedId = null;
		}, 2000);
	}

	async function createLink() {
		if (!organizationId || creating) return;
		creating = true;
		errorMessage = null;
		createdUrl = null;
		try {
			const result = await createDemoLink({
				organizationId,
				expiresInDays: Number(expiresInDays) as DemoExpiryDays,
			});
			createdUrl = result.url;
			await copyUrl(result.id, result.url);
			await listDemoLinks().refresh();
		} catch (err) {
			const message = err instanceof Error ? err.message : '';
			errorMessage =
				message === 'Failed to fetch'
					? 'Could not reach the server. Refresh the page and try again.'
					: message || 'Could not create that demo link.';
		} finally {
			creating = false;
		}
	}

	function formatExpiry(date: Date) {
		return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	}
</script>

<section class="space-y-3">
	<div>
		<h2 class="text-xl font-semibold">Demo links</h2>
		<p class="mt-1 text-sm text-[#8B949E]">
			One link opens player dashboards, coach dashboards, and stats together. No login required.
		</p>
	</div>

	<div class="max-w-xl space-y-3 rounded-2xl border border-[#2A3038] bg-[#161B22] p-4">
		<label class="block space-y-1 text-sm">
			<span class="text-[#8B949E]">League</span>
			<select class={selectClass} bind:value={organizationId}>
				{#if leagues.length === 0}
					<option value="">No leagues yet</option>
				{:else}
					<option value="">Select a league</option>
					{#each leagues as league (league.id)}
						<option value={league.id}>{league.name}</option>
					{/each}
				{/if}
			</select>
		</label>

		<label class="block space-y-1 text-sm">
			<span class="text-[#8B949E]">Expires</span>
			<select class={selectClass} bind:value={expiresInDays}>
				{#each demoExpiryDays as days (days)}
					<option value={days}>{days} days</option>
				{/each}
			</select>
		</label>

		<button
			type="button"
			class="rounded-md bg-[#58A6FF] px-3 py-2 text-sm font-semibold text-[#0D1117] disabled:opacity-60"
			disabled={creating || !organizationId}
			onclick={createLink}
		>
			{creating ? 'Creating…' : 'Create demo link'}
		</button>

		{#if createdUrl}
			<div
				class="flex flex-wrap items-center gap-2 rounded-md border border-[#238636]/40 bg-[#238636]/10 p-3"
			>
				<p class="min-w-0 flex-1 truncate text-sm text-[#E6EDF3]">{createdUrl}</p>
				<button
					type="button"
					class="inline-flex items-center gap-1 text-sm text-[#58A6FF] hover:underline"
					onclick={() => copyUrl('created', createdUrl!)}
				>
					<ClipboardIcon class="size-4" />
					{copiedId === 'created' ? 'Copied' : 'Copy'}
				</button>
			</div>
		{/if}
		{#if errorMessage}
			<p class="text-sm text-[#F85149]">{errorMessage}</p>
		{/if}
	</div>

	{#if activeLinks.length > 0}
		<div class="overflow-hidden rounded-2xl border border-[#2A3038] bg-[#161B22]">
			<table class="w-full text-left text-sm">
				<thead class="border-b border-[#2A3038] text-xs tracking-wide text-[#8B949E] uppercase">
					<tr>
						<th class="px-4 py-3 font-semibold">Includes</th>
						<th class="hidden px-4 py-3 font-semibold sm:table-cell">League</th>
						<th class="hidden px-4 py-3 font-semibold md:table-cell">Expires</th>
						<th class="px-4 py-3 font-semibold">Actions</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-[#2A3038]">
					{#each activeLinks as link (link.id)}
						<tr class="hover:bg-[#1C2128]">
							<td class="px-4 py-3">
								<p class="font-medium">{link.kindLabel}</p>
								<p class="text-xs text-[#8B949E] sm:hidden">{link.leagueName}</p>
							</td>
							<td class="hidden px-4 py-3 text-[#8B949E] sm:table-cell">{link.leagueName}</td>
							<td class="hidden px-4 py-3 text-[#8B949E] md:table-cell">
								{formatExpiry(link.expiresAt)}
							</td>
							<td class="px-4 py-3">
								<div class="flex flex-wrap gap-3">
									<button
										type="button"
										class="text-[#58A6FF] hover:underline"
										onclick={() => copyUrl(link.id, link.url)}
									>
										{copiedId === link.id ? 'Copied' : 'Copy link'}
									</button>
									<button
										type="button"
										class="text-[#F85149] hover:underline disabled:opacity-60"
										disabled={!!revokeDemoLink.pending}
										onclick={async () => {
											await revokeDemoLink({ id: link.id });
											await listDemoLinks().refresh();
										}}
									>
										Revoke
									</button>
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</section>
