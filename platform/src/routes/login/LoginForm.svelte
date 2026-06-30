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
	import { enhance } from '$app/forms';
	import Collapsible from '$lib/components/Collapsible.svelte';
	import * as Alert from '$lib/components/ui/alert';
	import ErrorIcon from '@lucide/svelte/icons/circle-x';
	import FieldErrorList from '$lib/components/FieldErrorList.svelte';
	import SubmitButton from '$lib/components/SubmitButton.svelte';
	import { createEnhanceHandler, focusFirstError } from '$lib/forms/enhance';
	import { goto } from '$app/navigation';
	import type { FormStateProp } from '$lib/forms/types';
	import type { LoginFormSchema } from '$lib/schemas/auth';
	import { tick } from 'svelte';

	interface Props extends HTMLAttributes<HTMLDivElement> {
		form?: FormStateProp<LoginFormSchema>;
	}

	let { class: className, form, ...restProps }: Props = $props();

	let submitting = $state(false);

	let fieldRefs: Partial<Record<keyof LoginFormSchema, HTMLInputElement | null>> = $state({
		email: null,
		password: null,
	});

	let isFormTarget = $derived(form?.target?.resource === 'auth' && form?.action === 'login');

	let handleLogin = createEnhanceHandler({
		onStart: () => {
			submitting = true;
		},
		onSuccess: async () => await goto(resolve('/onboarding')),
		onEnd: async () => {
			submitting = false;

			await tick(); // lets submitting change propagate first

			if (form?.errors && isFormTarget) {
				focusFirstError(fieldRefs, form.errors);
			} else {
				fieldRefs.email?.focus();
			}
		},
	});
</script>

<div class={cn('flex flex-col gap-6', className)} {...restProps}>
	<form method="POST" use:enhance={handleLogin}>
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
				<Collapsible isOpen={!!form?.error}>
					<Alert.Root variant="destructive">
						<ErrorIcon />
						<Alert.Title>Error</Alert.Title>
						<Alert.Description>{form?.error}</Alert.Description>
					</Alert.Root>
				</Collapsible>
				<Field.Field>
					<Field.Label for="email">Email</Field.Label>
					<Input id="email" name="email" type="text" required bind:ref={fieldRefs.email} />
					<FieldErrorList errors={form?.errors?.email} />
				</Field.Field>
				<PasswordField errors={form?.errors?.password} bind:ref={fieldRefs.password} />
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
