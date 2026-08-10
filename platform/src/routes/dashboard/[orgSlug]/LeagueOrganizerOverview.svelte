<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { getCurrentSeason } from '$lib/api/season.remote';
	import type { Organization } from '$lib/server/db/auth-schema';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Spinner } from '$lib/components/ui/spinner';
	import AnimatedNumber from '$lib/components/AnimatedNumber.svelte';
	import {
		getOrgDivisionCount,
		getOrgGameCount,
		getOrgPlayerCount,
		getOrgSeasonCount,
		getOrgTeamCount,
	} from '$lib/api/organization.remote';

	let { org }: { org: Organization } = $props();
	const currentSeason = $derived(await getCurrentSeason({ organizationId: org.id }));

	const numberFormatter = new Intl.NumberFormat('en', {
		style: 'decimal',
		maximumFractionDigits: 0,
	});

	const format = (n: number) => numberFormatter.format(n);
</script>

<div class="grid grid-cols-1 gap-6 p-8 lg:grid-cols-2">
	<section class="text-center lg:col-span-2">
		<h1 class="text-2xl font-bold">{org.name} Overview</h1>
	</section>

	<section class="text-center lg:col-span-2">
		{#if currentSeason}
			<h2 class="text-xl">
				Current Season:
				<a
					href={resolve('/dashboard/[orgSlug]/seasons/[seasonSlug]', {
						orgSlug: page.params.orgSlug!,
						seasonSlug: currentSeason.slug,
					})}
					class="underline"
				>
					{currentSeason.name}
				</a>
			</h2>
		{:else}
			<h2 class="text-xl">No active current season..</h2>
		{/if}
	</section>

	<section class="flex flex-col justify-center gap-4 lg:col-span-2 lg:w-3/4 lg:justify-self-center">
		<h2 class="text-center text-xl font-medium">At a Glance</h2>
		<div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
			<Card.Root>
				<Card.Header>
					<Card.Title>Seasons</Card.Title>
				</Card.Header>
				<Card.Content class="text-2xl">
					{#await getOrgSeasonCount({ organizationId: org.id })}
						<Spinner class="size-6" />
					{:then count}
						<AnimatedNumber end={count} {format} />
					{/await}
				</Card.Content>
			</Card.Root>
			<Card.Root>
				<Card.Header>
					<Card.Title>Games</Card.Title>
				</Card.Header>
				<Card.Content class="text-2xl">
					{#await getOrgGameCount({ organizationId: org.id })}
						<Spinner class="size-6" />
					{:then count}
						<AnimatedNumber end={count} {format} />
					{/await}
				</Card.Content>
			</Card.Root>
			<Card.Root>
				<Card.Header>
					<Card.Title>Divisions</Card.Title>
				</Card.Header>
				<Card.Content class="text-2xl">
					{#await getOrgDivisionCount({ organizationId: org.id })}
						<Spinner class="size-6" />
					{:then count}
						<AnimatedNumber end={count} {format} />
					{/await}
				</Card.Content>
			</Card.Root>
			<Card.Root>
				<Card.Header>
					<Card.Title>Teams</Card.Title>
				</Card.Header>
				<Card.Content class="text-2xl">
					{#await getOrgTeamCount({ organizationId: org.id })}
						<Spinner class="size-6" />
					{:then count}
						<AnimatedNumber end={count} {format} />
					{/await}
				</Card.Content>
			</Card.Root>
			<Card.Root>
				<Card.Header>
					<Card.Title>Players</Card.Title>
				</Card.Header>
				<Card.Content class="text-2xl">
					{#await getOrgPlayerCount({ organizationId: org.id })}
						<Spinner class="size-6" />
					{:then count}
						<AnimatedNumber end={count} {format} />
					{/await}
				</Card.Content>
			</Card.Root>
		</div>
	</section>
</div>
