<script lang="ts">
	import { resolve } from '$app/paths';
	import { PUBLIC_APP_NAME } from '$env/static/public';
	import { getPublicHomeSnapshot } from '$lib/api/home.remote';
	import AnimatedNumber from '$lib/components/AnimatedNumber.svelte';

	const home = $derived(await getPublicHomeSnapshot());

	const formatWhole = (n: number) =>
		new Intl.NumberFormat('en', { maximumFractionDigits: 0 }).format(n);

	const formatDate = (d: Date | null) => {
		if (!d) return '';
		return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	};

	const gamesHref = resolve('/stats');
	const leadersHref = resolve('/stats');
	const standingsHref = resolve('/standings');

	const glance = $derived([
		{
			label: 'Players',
			value: home.counts.players || 325,
			suffix: home.counts.players ? '' : '+',
		},
		{ label: 'Teams', value: home.counts.teams || 20, suffix: '' },
		{
			label: 'Games',
			value: home.counts.games || 100,
			suffix: home.counts.games ? '' : '+',
		},
		{ label: 'Divisions', value: home.counts.divisions || 6, suffix: '' },
	]);

	const audiences = [
		{
			title: 'League Organizers',
			body: 'Manage teams, schedules, standings, statistics and league performance.',
			href: resolve('/login'),
		},
		{
			title: 'Coaches',
			body: 'Track your team, review player performance and identify development opportunities.',
			href: resolve('/login'),
		},
		{
			title: 'Players & Families',
			body: 'See personal statistics, progress, strengths and areas to improve.',
			href: resolve('/login'),
		},
	] as const;

	const steps = [
		{ n: '01', title: 'Play', body: 'Games are played and statistics are recorded.' },
		{
			n: '02',
			title: 'Track',
			body: 'GameChanger organizes team and individual performance data.',
		},
		{
			n: '03',
			title: 'Understand',
			body: 'Coaches and players see patterns, strengths and areas for development.',
		},
		{
			n: '04',
			title: 'Improve',
			body: 'Players track their progress throughout the season.',
		},
	] as const;
</script>

<svelte:head>
	<title>{PUBLIC_APP_NAME} | Track the Game. Develop the Player.</title>
	<meta
		name="description"
		content="GameChanger helps youth leagues, coaches and families track performance, understand player development and celebrate progress throughout the season."
	/>
</svelte:head>

<div class="home-platform min-h-screen text-[#E8F0EA]" style="font-family: Figtree, system-ui, sans-serif">
	<!-- Hero -->
	<section
		class="relative overflow-hidden border-b border-white/10 bg-[radial-gradient(ellipse_at_top_left,_#1A2A22_0%,_#0C1210_50%,_#0A100E_100%)]"
	>
		<div
			class="pointer-events-none absolute inset-0 opacity-40"
			style="background-image: repeating-linear-gradient(-12deg, transparent, transparent 48px, rgba(184,224,92,0.04) 48px, rgba(184,224,92,0.04) 49px)"
		></div>
		<div
			class="pointer-events-none absolute -right-24 top-10 h-72 w-72 rounded-full bg-[#B8E05C]/15 blur-3xl"
		></div>
		<div
			class="pointer-events-none absolute -bottom-16 left-1/3 h-56 w-56 rounded-full bg-[#4A7C59]/20 blur-3xl"
		></div>

		<div
			class="relative mx-auto grid min-h-[78vh] max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-2"
		>
			<div>
				<h1
					class="hero-fade max-w-3xl text-5xl leading-[0.95] font-extrabold tracking-tight text-[#E8F0EA] sm:text-6xl lg:text-7xl"
					style="font-family: 'Barlow Condensed', system-ui, sans-serif"
				>
					Track the Game.<br />
					<span class="text-[#B8E05C]">Develop the Player.</span>
				</h1>
				<p class="hero-fade hero-delay-1 mt-6 max-w-xl text-lg leading-relaxed text-[#A8B8AE]">
					GameChanger helps youth leagues, coaches and families track performance, understand player
					development and celebrate progress throughout the season.
				</p>
				<div class="hero-fade hero-delay-2 mt-8 flex flex-wrap gap-3">
					<a
						href={resolve('/stats')}
						class="inline-flex items-center justify-center rounded-md bg-[#B8E05C] px-5 py-3 text-sm font-semibold text-[#0C1210] transition-transform hover:scale-[1.02] hover:bg-[#C8E06A]"
					>
						View League Stats
					</a>
					<a
						href={resolve('/login')}
						class="inline-flex items-center justify-center rounded-md border border-white/20 bg-white/5 px-5 py-3 text-sm font-semibold text-[#E8F0EA] backdrop-blur transition-colors hover:border-[#B8E05C]/50 hover:bg-white/10"
					>
						Player / Family Login
					</a>
					<a
						href={resolve('/login')}
						class="inline-flex items-center justify-center rounded-md px-5 py-3 text-sm font-semibold text-[#B8E05C] underline-offset-4 hover:underline"
					>
						Coach Login
					</a>
				</div>
			</div>

			<div class="hero-fade hero-delay-1 flex min-h-[14rem] items-center justify-center lg:min-h-[22rem] lg:justify-end">
				{#if home.league?.logo}
					<img
						src={home.league.logo}
						alt="{home.league.name} logo"
						class="max-h-56 w-full max-w-md object-contain sm:max-h-72 lg:max-h-80"
					/>
				{/if}
			</div>
		</div>
	</section>

	<!-- Audiences -->
	<section class="border-b border-white/10 bg-[#0C1210] py-16 sm:py-20">
		<div class="mx-auto max-w-6xl px-4 sm:px-6">
			<p class="text-xs font-semibold tracking-[0.18em] text-[#8FA398] uppercase">Who it’s for</p>
			<h2
				class="mt-2 text-3xl font-bold tracking-tight sm:text-4xl"
				style="font-family: 'Barlow Condensed', system-ui, sans-serif"
			>
				One platform. Three dashboards.
			</h2>
			<div class="mt-10 grid gap-4 md:grid-cols-3">
				{#each audiences as card (card.title)}
					<a
						href={card.href}
						class="group flex flex-col border border-white/10 bg-[#151D19] p-6 transition-colors hover:border-[#B8E05C]/40 hover:bg-[#1C2621]"
					>
						<h3
							class="text-2xl font-bold tracking-tight"
							style="font-family: 'Barlow Condensed', system-ui, sans-serif"
						>
							{card.title}
						</h3>
						<p class="mt-3 flex-1 text-sm leading-relaxed text-[#A8B8AE]">{card.body}</p>
						<span class="mt-6 text-sm font-semibold text-[#B8E05C] group-hover:underline">
							Learn More →
						</span>
					</a>
				{/each}
			</div>
		</div>
	</section>

	<!-- Season -->
	<section id="season" class="scroll-mt-20 border-b border-white/10 bg-[#121A16] py-16 sm:py-20">
		<div class="mx-auto max-w-6xl px-4 sm:px-6">
			<div class="flex flex-wrap items-end justify-between gap-4">
				<div>
					<p class="text-xs font-semibold tracking-[0.18em] text-[#8FA398] uppercase">
						{#if home.league}{home.league.name}{:else}Season at a Glance{/if}
					</p>
					<h2
						class="mt-2 text-3xl font-bold tracking-tight sm:text-4xl"
						style="font-family: 'Barlow Condensed', system-ui, sans-serif"
					>
						Season at a Glance
					</h2>
				</div>
				{#if home.season}
					<p class="text-sm text-[#8FA398]">{home.season.name}</p>
				{/if}
			</div>

			<div class="mt-10 grid grid-cols-2 gap-6 sm:grid-cols-4">
				{#each glance as item (item.label)}
					<div>
						<p
							class="text-4xl font-extrabold tabular-nums tracking-tight text-[#B8E05C] sm:text-5xl"
							style="font-family: 'Barlow Condensed', system-ui, sans-serif"
						>
							<AnimatedNumber
								end={item.value}
								format={(n) => `${formatWhole(n)}${item.suffix}`}
							/>
						</p>
						<p class="mt-1 text-sm font-medium text-[#8FA398]">{item.label}</p>
					</div>
				{/each}
			</div>

			<div class="mt-12 grid gap-8 lg:grid-cols-3">
				<div>
					<div class="flex items-center justify-between gap-2">
						<h3 class="text-sm font-semibold tracking-wide text-[#8FA398] uppercase">
							Latest Games
						</h3>
						<a href={gamesHref} class="text-xs font-semibold text-[#B8E05C] hover:underline">
							View league stats →
						</a>
					</div>
					{#if home.latestGames.length === 0}
						<p class="mt-4 text-sm text-[#8FA398]">Games will appear here as the season unfolds.</p>
					{:else}
						<ul class="mt-4 space-y-3">
							{#each home.latestGames as game (game.id)}
								<li class="border-b border-white/10 pb-3 text-sm">
									<p class="font-medium">
										{game.awayName}
										{#if game.awayScore != null && game.homeScore != null}
											<span class="tabular-nums text-[#B8E05C]">
												{game.awayScore}–{game.homeScore}
											</span>
										{/if}
										{game.homeName}
									</p>
									{#if game.at}
										<p class="mt-0.5 text-xs text-[#8FA398]">{formatDate(game.at)}</p>
									{/if}
								</li>
							{/each}
						</ul>
					{/if}
				</div>

				<div>
					<h3 class="text-sm font-semibold tracking-wide text-[#8FA398] uppercase">
						Upcoming Games
					</h3>
					{#if home.upcomingGames.length === 0}
						<p class="mt-4 text-sm text-[#8FA398]">No upcoming games scheduled yet.</p>
					{:else}
						<ul class="mt-4 space-y-3">
							{#each home.upcomingGames as game (game.id)}
								<li class="border-b border-white/10 pb-3 text-sm">
									<p class="font-medium">{game.awayName} @ {game.homeName}</p>
									{#if game.at}
										<p class="mt-0.5 text-xs text-[#8FA398]">{formatDate(game.at)}</p>
									{/if}
								</li>
							{/each}
						</ul>
					{/if}
				</div>

				<div>
					<h3 class="text-sm font-semibold tracking-wide text-[#8FA398] uppercase">Standings</h3>
					{#if home.standings.length === 0}
						<p class="mt-4 text-sm text-[#8FA398]">Standings unlock once games are completed.</p>
					{:else}
						<ul class="mt-4 space-y-2">
							{#each home.standings as row, i (row.name)}
								<li class="flex items-center justify-between gap-2 text-sm">
									<span class="truncate">
										<span class="mr-2 tabular-nums text-[#8FA398]">{i + 1}.</span>
										{row.name}
									</span>
									<span class="shrink-0 tabular-nums font-medium">{row.wins}–{row.losses}</span>
								</li>
							{/each}
						</ul>
						<a href={standingsHref} class="mt-3 inline-block text-xs font-semibold text-[#B8E05C] hover:underline">
							All standings →
						</a>
					{/if}
				</div>
			</div>
		</div>
	</section>

	<!-- Differentiator -->
	<section class="border-b border-white/10 bg-[#151D19] py-16 sm:py-20">
		<div class="mx-auto max-w-6xl px-4 sm:px-6">
			<p class="text-xs font-semibold tracking-[0.18em] text-[#8FA398] uppercase">
				The differentiator
			</p>
			<h2
				class="mt-2 max-w-2xl text-3xl font-bold tracking-tight sm:text-5xl"
				style="font-family: 'Barlow Condensed', system-ui, sans-serif"
			>
				More Than a Scoreboard
			</h2>
			<p class="mt-4 max-w-xl text-[#A8B8AE]">
				GameChanger turns game statistics into player development insights — so athletes see how
				they’re improving, not just whether their team won.
			</p>

			<div class="mt-12 flex flex-col items-stretch gap-8 lg:flex-row lg:items-center lg:gap-12">
				<div class="flex flex-1 flex-wrap items-end justify-center gap-6 sm:gap-10">
					<div class="text-center">
						<p class="text-xs tracking-wide text-[#8FA398] uppercase">Season Start</p>
						<p
							class="mt-2 text-5xl font-extrabold tabular-nums"
							style="font-family: 'Barlow Condensed', system-ui, sans-serif"
						>
							9.4
						</p>
						<p class="text-sm text-[#8FA398]">PPG</p>
					</div>
					<div class="pb-6 text-3xl text-[#B8E05C]" aria-hidden="true">→</div>
					<div class="text-center">
						<p class="text-xs tracking-wide text-[#8FA398] uppercase">Current</p>
						<p
							class="mt-2 text-5xl font-extrabold tabular-nums text-[#B8E05C]"
							style="font-family: 'Barlow Condensed', system-ui, sans-serif"
						>
							14.2
						</p>
						<p class="text-sm text-[#8FA398]">PPG</p>
					</div>
					<div class="w-full text-center sm:w-auto">
						<p
							class="inline-block border border-[#B8E05C]/40 px-4 py-2 text-lg font-bold text-[#B8E05C]"
						>
							+51% Improvement
						</p>
					</div>
				</div>

				<div class="grid flex-1 gap-4 sm:grid-cols-2">
					<div class="border border-white/10 bg-[#0C1210]/60 p-5">
						<p class="text-xs font-semibold tracking-wide text-[#B8E05C] uppercase">Strengths</p>
						<ul class="mt-3 space-y-2 text-sm text-[#E8F0EA]">
							<li>Passing</li>
							<li>Rebounding</li>
							<li>Defensive awareness</li>
						</ul>
					</div>
					<div class="border border-white/10 bg-[#0C1210]/60 p-5">
						<p class="text-xs font-semibold tracking-wide text-[#E8C46A] uppercase">Focus Areas</p>
						<ul class="mt-3 space-y-2 text-sm text-[#E8F0EA]">
							<li>Free throws</li>
							<li>Turnovers</li>
							<li>Finishing</li>
						</ul>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- How it works -->
	<section class="border-b border-white/10 bg-[#0C1210] py-16 sm:py-20">
		<div class="mx-auto max-w-6xl px-4 sm:px-6">
			<p class="text-xs font-semibold tracking-[0.18em] text-[#8FA398] uppercase">Simple by design</p>
			<h2
				class="mt-2 text-3xl font-bold tracking-tight sm:text-4xl"
				style="font-family: 'Barlow Condensed', system-ui, sans-serif"
			>
				How GameChanger Works
			</h2>
			<ol class="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
				{#each steps as step (step.n)}
					<li class="border-t-2 border-[#B8E05C] pt-4">
						<p
							class="text-sm font-bold tracking-widest text-[#B8E05C]"
							style="font-family: 'Barlow Condensed', system-ui, sans-serif"
						>
							{step.n}
						</p>
						<h3
							class="mt-2 text-2xl font-bold"
							style="font-family: 'Barlow Condensed', system-ui, sans-serif"
						>
							{step.title}
						</h3>
						<p class="mt-2 text-sm leading-relaxed text-[#A8B8AE]">{step.body}</p>
					</li>
				{/each}
			</ol>
		</div>
	</section>

	<!-- Rising Stars -->
	<section class="border-b border-white/10 bg-[#121A16] py-16 sm:py-20">
		<div class="mx-auto max-w-6xl px-4 sm:px-6">
			<div class="flex flex-wrap items-end justify-between gap-4">
				<div>
					<p class="text-xs font-semibold tracking-[0.18em] text-[#8FA398] uppercase">
						Rising Stars
					</p>
					<h2
						class="mt-2 text-3xl font-bold tracking-tight sm:text-4xl"
						style="font-family: 'Barlow Condensed', system-ui, sans-serif"
					>
						Top Performers This Week
					</h2>
					<p class="mt-2 text-sm text-[#8FA398]">
						Public league statistics only — development reports stay private.
					</p>
				</div>
				<a href={leadersHref} class="text-sm font-semibold text-[#B8E05C] hover:underline">
					View League Leaders →
				</a>
			</div>

			{#if home.risingStars.length === 0}
				<p class="mt-8 text-sm text-[#8FA398]">
					Player leaders will appear once game stats are recorded.
				</p>
			{:else}
				<div class="mt-8 overflow-x-auto">
					<table class="w-full min-w-[480px] text-left text-sm">
						<thead class="border-b border-white/10 text-xs tracking-wide text-[#8FA398] uppercase">
							<tr>
								<th class="pb-3 font-semibold">Player</th>
								<th class="pb-3 font-semibold">Team</th>
								<th class="pb-3 font-semibold">Division</th>
								<th class="pb-3 font-semibold tabular-nums">PTS</th>
								<th class="pb-3 font-semibold tabular-nums">REB</th>
								<th class="pb-3 font-semibold tabular-nums">AST</th>
							</tr>
						</thead>
						<tbody>
							{#each home.risingStars as star (star.name + star.teamName + star.divisionName)}
								<tr class="border-b border-white/5">
									<td class="py-3 font-medium">{star.name}</td>
									<td class="py-3 text-[#8FA398]">{star.teamName}</td>
									<td class="py-3 text-[#8FA398]">{star.divisionName}</td>
									<td class="py-3 tabular-nums font-semibold text-[#B8E05C]">{star.pts}</td>
									<td class="py-3 tabular-nums">{star.reb}</td>
									<td class="py-3 tabular-nums">{star.ast}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</div>
	</section>

	<!-- Story -->
	<section id="story" class="scroll-mt-20 bg-[#0C1210] py-16 sm:py-20">
		<div class="mx-auto max-w-3xl px-4 text-center sm:px-6">
			<p class="text-xs font-semibold tracking-[0.18em] text-[#8FA398] uppercase">Our story</p>
			<h2
				class="mt-2 text-3xl font-bold tracking-tight sm:text-4xl"
				style="font-family: 'Barlow Condensed', system-ui, sans-serif"
			>
				Built by Youth, for Youth Sports
			</h2>
			<p class="mt-4 text-base leading-relaxed text-[#A8B8AE]">
				GameChanger began as a youth-led project to make basketball statistics more accessible and
				meaningful for players, coaches and families — turning box scores into development that
				matters.
			</p>
			<a
				href={resolve('/signup')}
				class="mt-8 inline-flex text-sm font-semibold text-[#B8E05C] hover:underline"
			>
				Our Story →
			</a>
		</div>
	</section>

	<footer class="border-t border-white/10 bg-[#0A100E] py-8">
		<div
			class="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 text-sm text-[#8FA398] sm:flex-row sm:px-6"
		>
			<p
				style="font-family: 'Barlow Condensed', system-ui, sans-serif"
				class="tracking-wide text-[#E8F0EA] uppercase"
			>
				{PUBLIC_APP_NAME}
			</p>
			<p>Track the game. Develop the player.</p>
		</div>
	</footer>
</div>

<style>
	.hero-fade {
		animation: home-rise 0.7s ease-out both;
	}
	.hero-delay-1 {
		animation-delay: 0.08s;
	}
	.hero-delay-2 {
		animation-delay: 0.16s;
	}
	@keyframes home-rise {
		from {
			opacity: 0;
			transform: translateY(14px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.hero-fade {
			animation: none;
		}
	}
</style>
