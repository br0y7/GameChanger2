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
	import { loginWithEmail } from '$lib/api/auth.remote';
	import { onMount } from 'svelte';
	import ErrorAlert from '$lib/components/ErrorAlert.svelte';

	interface Props extends HTMLAttributes<HTMLDivElement> {
		email?: string;
	}
	let { class: className, email, ...restProps }: Props = $props();

	let submitting = $derived(!!loginWithEmail.pending);

	let passwordField: HTMLInputElement | null = $state(null);
	onMount(() => {
		if (email) {
			passwordField?.focus();
		}
	});
</script>

<div class={cn('flex flex-col gap-6', className)} {...restProps}>
	<form
		{@attach focusFirstError({
			submitting,
			issues: loginWithEmail.fields.allIssues(),
		})}
		{...loginWithEmail}
	>
		<Field.Set disabled={submitting}>
			<Field.Group>
				<div class="flex flex-col items-center gap-2 text-center">
					<a href="#/" class="flex flex-col items-center gap-2 font-medium">
						<div class="flex size-8 items-center justify-center rounded-md">
							<ChartSplineIcon class="size-6" />
						</div>
						<span class="sr-only">{env.PUBLIC_APP_NAME}</span>
					</a>
					<h1 class="text-2xl font-bold">Welcome back</h1>
					<Field.FieldDescription class="text-center">
						Sign in to check updates, manage teams, and more.
					</Field.FieldDescription>
				</div>
				<Field.Field>
					<GoogleButton disabled={submitting} />
				</Field.Field>
				<Field.Separator>Or</Field.Separator>
				<ErrorAlert errors={loginWithEmail.fields.issues()} />
				<Field.Field>
					<Field.Label for="email">Email</Field.Label>
					<Input id="email" {...loginWithEmail.fields.email.as('email', email ?? '')} required />
					<FieldErrorList errors={loginWithEmail.fields.email.issues()} />
				</Field.Field>
				<PasswordField
					{...loginWithEmail.fields.password.as('password')}
					errors={loginWithEmail.fields.password.issues()}
					required
					bind:ref={passwordField}
				/>
				<Field.Field>
					<SubmitButton {submitting}>Sign In</SubmitButton>
				</Field.Field>
				<div class="flex flex-col items-center">
					<Field.Description>
						Don't have an account? <a href={resolve('/signup')}>Create Account</a>
					</Field.Description>
				</div>
			</Field.Group>
		</Field.Set>
	</form>
</div>
