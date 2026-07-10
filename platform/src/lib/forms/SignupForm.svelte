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
	import * as Alert from '$lib/components/ui/alert';
	import ErrorIcon from '@lucide/svelte/icons/circle-x';
	import FieldErrorList from '$lib/components/FieldErrorList.svelte';
	import Collapsible from '$lib/components/Collapsible.svelte';
	import SubmitButton from '$lib/components/SubmitButton.svelte';
	import { focusFirstError } from '$lib/forms/enhance';
	import { signUpWithEmail } from '$lib/api/auth.remote';

	interface Props extends HTMLAttributes<HTMLDivElement> {
		title?: string;
		description?: string;
	}

	let {
		class: className,
		title = 'Create your account',
		description = 'Get started to track stats, manage teams, and more.',
		...restProps
	}: Props = $props();

	let submitting = $derived(!!signUpWithEmail.pending);
	let systemErrors = $derived(signUpWithEmail.fields.issues() ?? []);
</script>

<div class={cn('flex flex-col', className)} {...restProps}>
	<form
		{@attach focusFirstError({ submitting, issues: signUpWithEmail.fields.allIssues() })}
		{...signUpWithEmail}
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
					<h1 class="text-2xl font-bold">{title}</h1>
					<Field.FieldDescription class="text-center">
						{description}
					</Field.FieldDescription>
				</div>
				<Field.Field>
					<GoogleButton disabled={submitting} />
				</Field.Field>
				<Field.Separator>Or</Field.Separator>
				<Field.Field>
					<Field.Label for="name">Name</Field.Label>
					<Input id="name" {...signUpWithEmail.fields.name.as('text')} required />
					<FieldErrorList errors={signUpWithEmail.fields.name.issues()} />
				</Field.Field>
				<Field.Field>
					<Field.Label for="email">Email</Field.Label>
					<Input id="email" {...signUpWithEmail.fields.email.as('email')} required />
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
					<Collapsible isOpen={systemErrors.length > 0}>
						<Alert.Root variant="destructive">
							<ErrorIcon />
							<Alert.Title>Error</Alert.Title>
							<Alert.Description>
								{#each systemErrors as error (error.message)}
									<p>{error.message}</p>
								{/each}
							</Alert.Description>
						</Alert.Root>
					</Collapsible>
					<Field.Description>
						Already have an account? <a href={resolve('/login')}>Log In</a>
					</Field.Description>
				</div>
			</Field.Group>
		</Field.Set>
	</form>
	<!-- <Field.Description class="px-6 text-center">
		By clicking continue, you agree to our <a href="#/">Terms of Service</a>
		and <a href="#/">Privacy Policy</a>.
	</Field.Description> -->
</div>
