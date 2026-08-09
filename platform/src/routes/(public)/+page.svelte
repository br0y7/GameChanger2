<script lang="ts">
	import { PUBLIC_APP_NAME } from '$env/static/public';
	import AnimatedNumber from '$lib/components/AnimatedNumber.svelte';

	const statsTrackedList = [
		'Points',
		'Rebounds (Offensive & Defensive)',
		'Assists',
		'Three-Pointers Made',
		'Field Goals Made',
		'Blocks',
		'Turnovers',
		'Personal Fouls',
		'Shooting Percentages (FT%, 3PT%, FG%) ',
	];

	const howItWorksList = [
		'Game stats are recorded live',
		'Performance metrics are calculated',
		'A GCIR (GameChanger Impact Rating) is generated',
		'A player development report is created',
	];

	const numberFormatter = new Intl.NumberFormat('en', {
		style: 'decimal',
		maximumFractionDigits: 0,
	});

	const formatWholeNumber = (n: number) => numberFormatter.format(n);
	const formatCurrency = (n: number) => `$${formatWholeNumber(n)}`;

	const visionList = [
		'Integrating video-based stat tracking',
		'Expanding to additional community leagues',
		'Building student-led analytics teams',
	];
</script>

<svelte:head>
	<title>{PUBLIC_APP_NAME} | Track stats, manage teams</title>
</svelte:head>

<main class="container mx-auto flex flex-col gap-12 px-6">
	<section class="flex h-[50vh] w-full flex-col items-center justify-center">
		<h1 class="text-5xl font-extrabold tracking-tight lg:text-6xl">{PUBLIC_APP_NAME}</h1>

		<p class="mt-4 text-lg text-muted-foreground">
			Build your roster. Manage your league. Keep everyone connected.
		</p>
		<p class="text-lg text-muted-foreground">
			Making performance data accessible to community leagues.
		</p>
	</section>

	<section class="flex flex-col gap-4">
		<h2 class="text-3xl font-semibold tracking-tight">What Is {PUBLIC_APP_NAME}?</h2>
		<p>
			GameChanger is a youth basketball analytics platform that tracks real game statistics and
			converts them into clear performance insights for players and coaches.
		</p>
		<p>
			By measuring points, rebounds, assists, shooting efficiency, and turnovers, GameChanger
			provides structured, data-driven feedback that helps athletes understand their strengths and
			areas for improvement.
		</p>
	</section>

	<section class="flex flex-col gap-4">
		<h2 class="text-3xl font-semibold tracking-tight">What We Track</h2>
		<ul>
			{#each statsTrackedList as stat (stat)}
				<li class="text-lg">{stat}</li>
			{/each}
		</ul>
		<p class="text-muted-foreground italic">
			GameChanger turns raw statistics into meaningful insights.
		</p>
	</section>

	<section class="flex flex-col gap-4">
		<h2 class="text-3xl font-semibold tracking-tight">How It Works</h2>
		<ol>
			{#each howItWorksList as step, index (step)}
				<li class="text-lg">{index + 1}. {step}</li>
			{/each}
		</ol>
		<p class="text-muted-foreground italic">
			GCIR (GameChanger Impact Rating) combines scoring efficiency (PPS), stats, and negative plays
			to measure overall game performance.
		</p>
	</section>

	<section class="flex flex-col gap-4">
		<h2 class="text-3xl font-semibold tracking-tight">Community Impact</h2>
		<div class="grid grid-cols-2 gap-8 sm:grid-cols-4">
			<div>
				<p class="text-sm">Funding secured</p>
				<AnimatedNumber end={1500} format={formatCurrency} class="text-2xl" />
			</div>
			<div>
				<p class="text-sm">Organizations</p>
				<AnimatedNumber end={2} format={formatWholeNumber} class="text-2xl" />
			</div>
			<div>
				<p class="text-sm">Youth Athletes Served</p>
				<AnimatedNumber
					end={50}
					format={(n: number) => `${formatWholeNumber(n)}+`}
					class="text-2xl"
				/>
			</div>
			<div>
				<p class="text-sm">Honorarium</p>
				<AnimatedNumber end={1000} format={formatCurrency} class="text-2xl" />
			</div>
		</div>
		<p class="text-sm text-muted-foreground italic">
			Recognized with a $1000 Honorarium from North Forge
		</p>
	</section>

	<section class="flex flex-col gap-4">
		<h2 class="text-3xl font-semibold tracking-tight">Vision</h2>
		<ul>
			{#each visionList as vision (vision)}
				<li class="text-lg">{vision}</li>
			{/each}
		</ul>
	</section>
</main>
