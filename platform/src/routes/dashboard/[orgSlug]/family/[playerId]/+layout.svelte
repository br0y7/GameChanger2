<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { getFamilyPlayerHome } from '$lib/api/family.remote';
	import type { LayoutProps } from './$types';

	let { children, params }: LayoutProps = $props();

	const home = $derived(await getFamilyPlayerHome({ playerId: params.playerId }));
	const base = $derived(
		resolve('/dashboard/[orgSlug]/family/[playerId]', {
			orgSlug: params.orgSlug,
			playerId: params.playerId,
		})
	);

	const nav = $derived([
		{ label: 'My Player', href: base, match: 'exact' as const },
		{ label: 'Schedule', href: `${base}/schedule`, match: 'exact' as const },
		{ label: 'Stats', href: `${base}/stats`, match: 'exact' as const },
		{ label: 'Development', href: `${base}/development`, match: 'exact' as const },
	]);

	const path = $derived(page.url.pathname.replace(/\/$/, '') || '/');

	function isActive(href: string, match: 'exact' | 'prefix') {
		const normalized = href.replace(/\/$/, '');
		return match === 'prefix'
			? path === normalized || path.startsWith(`${normalized}/`)
			: path === normalized;
	}
</script>

<div class="min-h-full bg-gradient-to-b from-[#0D1117] via-[#111820] to-[#0D1117] text-[#E6EDF3]">
	<div class="mx-auto w-full max-w-2xl space-y-6 px-4 py-6 sm:px-6">
		<header class="text-center sm:text-left">
			<p class="text-xs font-semibold tracking-wide text-[#58A6FF] uppercase">Family Portal</p>
			<p class="mt-1 text-sm text-[#8B949E]">{home.player.leagueName}</p>
			<h1 class="mt-1 text-3xl font-extrabold tracking-tight">{home.player.name}</h1>
			<p class="mt-1 text-sm text-[#8B949E]">
				#{home.player.jerseyNumber}
				{#if home.player.divisionName}
					· {home.player.divisionName}
				{/if}
				· {home.player.teamName}
			</p>
		</header>

		<nav
			class="flex justify-center gap-4 overflow-x-auto border-b border-[#2A3038] sm:justify-start"
			aria-label="Family portal"
		>
			{#each nav as item (item.label)}
				{@const active = isActive(item.href, item.match)}
				<a
					href={item.href}
					class="shrink-0 border-b-2 pb-3 text-sm font-medium transition-colors {active
						? 'border-[#58A6FF] text-[#58A6FF]'
						: 'border-transparent text-[#8B949E] hover:text-[#E6EDF3]'}"
				>
					{item.label}
				</a>
			{/each}
		</nav>

		{@render children()}
	</div>
</div>
