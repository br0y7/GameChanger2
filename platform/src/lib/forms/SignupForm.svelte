<script lang="ts">
	import ChartSplineIcon from '@lucide/svelte/icons/chart-spline';
	import { cn } from '$lib/utils.js';
	import * as Field from '$lib/components/ui/field/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import type { HTMLAttributes } from 'svelte/elements';
	import { resolve } from '$app/paths';
	import { env } from '$env/dynamic/public';
	import PasswordField from '$lib/components/PasswordField.svelte';
	import GoogleButton from '$lib/components/GoogleButton.svelte';
	import FieldErrorList from '$lib/components/FieldErrorList.svelte';
	import SubmitButton from '$lib/components/SubmitButton.svelte';
	import { focusFirstError } from '$lib/forms/enhance';
	import { signUpWithEmail } from '$lib/api/auth.remote';
	import ErrorAlert from '$lib/components/ErrorAlert.svelte';
	import { page } from '$app/state';
	import { REDIRECT_TO_PARAM } from '$lib/utils/url';
	import type { SignupRole } from '$lib/schemas/auth';

	interface Props extends HTMLAttributes<HTMLDivElement> {
		title?: string;
		description?: string;
		email?: string;
		/** When set (e.g. invite flow), hide role picker and submit this role. */
		fixedRole?: SignupRole | null;
		showRolePicker?: boolean;
	}

	let {
		class: className,
		title = 'Create your account',
		description = 'Get started to track stats, manage teams, and more.',
		email = '',
		fixedRole = null,
		showRolePicker = true,
		...restProps
	}: Props = $props();

	let submitting = $derived(!!signUpWithEmail.pending);
	let selectedRole = $state<SignupRole>('coach');

	$effect(() => {
		if (fixedRole) selectedRole = fixedRole;
	});

	$effect(() => {
		signUpWithEmail.fields.set({ role: fixedRole ?? selectedRole });
	});

	const redirectTo = $derived(page.url.searchParams.get(REDIRECT_TO_PARAM) ?? '');
	const loginHref = $derived(
		redirectTo
			? resolve(
					`/login?${new URLSearchParams({
						[REDIRECT_TO_PARAM]: redirectTo,
						...(email ? { email } : {}),
					})}`
				)
			: resolve('/login')
	);

	const roles: { value: SignupRole; label: string; hint: string }[] = [
		{
			value: 'coach',
			label: 'Coach',
			hint: 'You’ll join a team with an invite link from your league.',
		},
		{
			value: 'player_follower',
			label: 'Player / Family',
			hint: 'You’ll follow a player after you receive an invite link.',
		},
		{
			value: 'organizer',
			label: 'League Organizer',
			hint: 'Create and run a league.',
		},
	];

	function pickRole(role: SignupRole) {
		selectedRole = role;
		signUpWithEmail.fields.set({ role });
	}
</script>

<div class={cn('flex flex-col', className)} {...restProps}>
	<form
		{@attach focusFirstError({ submitting, issues: signUpWithEmail.fields.allIssues() })}
		{...signUpWithEmail}
	>
		<input {...signUpWithEmail.fields.redirectTo.as('hidden', redirectTo)} />
		<input {...signUpWithEmail.fields.role.as('hidden', fixedRole ?? selectedRole)} />
		<Field.Set disabled={submitting}>
			<Field.Group>
				<div class="flex flex-col items-center gap-2 text-center">
					<a href="#/" class="flex flex-col items-center gap-2 font-medium">
						<div class="flex size-8 items-center justify-center rounded-md">
							<ChartSplineIcon class="size-6" />
						</div>
						<span class="sr-only">{env.PUBLIC_APP_NAME}</span>
					</a>
					<h1 class="text-2xl font-bold">{title}</h1>
					<Field.FieldDescription class="text-center">
						{description}
					</Field.FieldDescription>
				</div>
				<Field.Field>
					<GoogleButton disabled={submitting} />
				</Field.Field>
				<Field.Separator>Or</Field.Separator>

				{#if showRolePicker && !fixedRole}
					<Field.Field>
						<Field.Label>I am signing up as</Field.Label>
						<div class="mt-2 space-y-2" role="radiogroup" aria-label="Account type">
							{#each roles as option (option.value)}
								<button
									type="button"
									class="flex w-full cursor-pointer gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors {selectedRole ===
									option.value
										? 'border-[#B8E05C]/60 bg-[#B8E05C]/10'
										: 'border-white/15 hover:border-white/30'}"
									onclick={() => pickRole(option.value)}
									aria-pressed={selectedRole === option.value}
								>
									<span
										class="mt-1 size-3.5 shrink-0 rounded-full border {selectedRole === option.value
											? 'border-[#B8E05C] bg-[#B8E05C]'
											: 'border-white/40'}"
									></span>
									<span>
										<span class="block text-sm font-semibold">{option.label}</span>
										<span class="mt-0.5 block text-xs text-[#8FA398]">{option.hint}</span>
									</span>
								</button>
							{/each}
						</div>
						<FieldErrorList errors={signUpWithEmail.fields.role.issues()} />
					</Field.Field>
				{/if}

				<Field.Field>
					<Field.Label for="name">Name</Field.Label>
					<Input id="name" {...signUpWithEmail.fields.name.as('text')} required />
					<FieldErrorList errors={signUpWithEmail.fields.name.issues()} />
				</Field.Field>
				<Field.Field>
					<Field.Label for="email">Email</Field.Label>
					<Input id="email" {...signUpWithEmail.fields.email.as('email', email)} required />
					<FieldErrorList errors={signUpWithEmail.fields.email.issues()} />
				</Field.Field>
				<PasswordField
					{...signUpWithEmail.fields.password.as('password')}
					required
					errors={signUpWithEmail.fields.password.issues()}
				/>
				<div class="flex flex-col items-center gap-3">
					<Field.Field>
						<SubmitButton {submitting}>Create Account</SubmitButton>
					</Field.Field>
					<ErrorAlert errors={signUpWithEmail.fields.issues()} />
					<Field.Description>
						Already have an account? <a href={loginHref}>Log In</a>
					</Field.Description>
				</div>
			</Field.Group>
		</Field.Set>
	</form>
</div>
