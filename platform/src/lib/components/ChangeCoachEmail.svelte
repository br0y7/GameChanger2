<script lang="ts">
	import { tick } from 'svelte';
	import { changeCoachEmail } from '$lib/api/coach.remote';
	import ErrorAlert from '$lib/components/ErrorAlert.svelte';
	import { Input } from '$lib/components/ui/input';

	interface Props {
		coachId: string;
		email: string | null;
		/** True when this coach already has a login tied to the email. */
		hasLogin: boolean;
		onSaved?: () => void | Promise<void>;
	}

	let { coachId, email, hasLogin, onSaved }: Props = $props();

	const emailForm = $derived(changeCoachEmail.for(coachId));
	let editing = $state(false);
	let input: HTMLInputElement | null = $state(null);
	let submitting = $derived(!!emailForm.pending);

	async function startEditing() {
		editing = true;
		emailForm.fields.set({ id: coachId, email: email ?? '' });
		await tick();
		input?.focus();
	}

	function stopEditing() {
		editing = false;
	}

	const enhanced = $derived(
		emailForm.enhance(async ({ submit }) => {
			if (await submit()) {
				stopEditing();
				await onSaved?.();
			}
		})
	);
</script>

{#if editing}
	<form class="flex min-w-56 flex-col gap-2" {...enhanced}>
		<input {...emailForm.fields.id.as('hidden', coachId)} />
		<Input
			{...emailForm.fields.email.as('email')}
			bind:ref={input}
			autocomplete="off"
			required
			placeholder="coach@email.com"
			class="h-8 border-[#2A3038] bg-[#0D1117] text-[#E6EDF3]"
		/>
		<p class="max-w-64 text-xs text-[#8B949E]">
			{#if hasLogin}
				They will sign in with this email. Their password stays the same.
			{:else}
				They will need this email to accept the invite and sign in.
			{/if}
		</p>
		<ErrorAlert errors={emailForm.fields.issues()} />
		<div class="flex gap-3">
			<button type="submit" class="text-[#58A6FF] hover:underline" disabled={submitting}>
				{submitting ? 'Saving...' : 'Save'}
			</button>
			<button
				type="button"
				class="text-[#8B949E] hover:text-[#E6EDF3]"
				disabled={submitting}
				onclick={stopEditing}
			>
				Cancel
			</button>
		</div>
	</form>
{:else}
	<button type="button" class="text-[#58A6FF] hover:underline" onclick={startEditing}>
		Change email
	</button>
{/if}
