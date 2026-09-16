<script lang="ts">
	import { getTeam } from '$lib/api/team.remote';
	import { getCoachAssignmentForTeamQuery } from '$lib/api/coach-portal.remote';
	import { coachRoleLabels } from '$lib/schemas/coach';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();
	const team = $derived(await getTeam({ id: params.teamId }));
	const assignment = $derived(await getCoachAssignmentForTeamQuery({ teamId: params.teamId }));
</script>

<section class="rounded-2xl border border-[#2A3038] bg-[#161B22] p-5">
	<h2 class="text-sm font-semibold tracking-wide text-[#8B949E] uppercase">Team Settings</h2>
	<p class="mt-1 text-sm text-[#8B949E]">View only — editing comes in a later phase.</p>

	<dl class="mt-4 space-y-3 text-sm">
		<div>
			<dt class="text-[#8B949E]">Team name</dt>
			<dd class="mt-1 font-medium">{team.name}</dd>
		</div>
		<div>
			<dt class="text-[#8B949E]">Slug</dt>
			<dd class="mt-1 font-mono text-[#E6EDF3]">{team.slug}</dd>
		</div>
		{#if assignment}
			<div>
				<dt class="text-[#8B949E]">Your role</dt>
				<dd class="mt-1 font-medium">{coachRoleLabels[assignment.assignmentRole]}</dd>
			</div>
		{/if}
	</dl>
</section>
