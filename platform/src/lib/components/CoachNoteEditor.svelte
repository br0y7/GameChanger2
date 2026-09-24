<script lang="ts">
	import { getCoachNote, saveCoachNote } from '$lib/api/player.remote';
	import SubmitButton from '$lib/components/SubmitButton.svelte';
	import ErrorPopover from '$lib/components/ErrorPopover.svelte';

	let { playerId }: { playerId: string } = $props();

	const note = $derived(await getCoachNote({ playerId }));
	const form = $derived(saveCoachNote.for(playerId));
	let saveButton: HTMLButtonElement | null = $state(null);
	const submitting = $derived(!!form.pending);

	$effect(() => {
		if (form.pending) return;
		form.fields.set({ playerId, body: note.body ?? '' });
	});
</script>

<form
	{...form.enhance(async ({ submit }) => {
		await submit();
	})}
	class="space-y-3"
>
	<input {...form.fields.playerId.as('hidden', playerId)} />
	<label class="block text-sm text-[#E6EDF3]" for="coach-note-{playerId}">
		Private note for this player's family
	</label>
	<textarea
		{...form.fields.body.as('text')}
		id="coach-note-{playerId}"
		rows="5"
		maxlength="2000"
		placeholder="Decision-making, effort, what to work on next..."
		class="w-full resize-y rounded-xl border border-[#2A3038] bg-[#0D1117] px-3 py-2 text-sm text-[#E6EDF3] outline-none placeholder:text-[#8B949E] focus:border-[#58A6FF]"
	></textarea>
	<div class="flex items-center justify-between gap-3">
		<p class="text-xs text-[#8B949E]">Only this family and league staff can see it.</p>
		<SubmitButton bind:ref={saveButton} {submitting} class="bg-[#238636] text-white hover:bg-[#2ea043]">
			Save note
		</SubmitButton>
		<ErrorPopover anchor={saveButton} errors={form.fields.issues()} title="Can't save note" />
	</div>
</form>
