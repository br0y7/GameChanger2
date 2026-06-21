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
	import type { PageProps } from './$types';
	import Collapsible from '$lib/components/Collapsible.svelte';
	import * as Alert from '$lib/components/ui/alert';
	import ErrorIcon from '@lucide/svelte/icons/circle-x';
	import FieldErrorList from '$lib/components/FieldErrorList.svelte';
	import { PUBLIC_APP_URL } from '$env/static/public';
	import SubmitButton from '$lib/components/SubmitButton.svelte';

	let {
		class: className,
		form,
		...restProps
	}: HTMLAttributes<HTMLDivElement> & { form: PageProps['form'] } = $props();

	let submitting = $state(false);
</script>

<div class={cn('flex flex-col gap-6', className)} {...restProps}>
	<form
		method="POST"
		use:enhance={() => {
			submitting = true;

			return async ({ update }) => {
				try {
					await update();

					if (form?.success) {
						window.location.replace(PUBLIC_APP_URL);
					}
				} finally {
					submitting = false;
				}
			};
		}}
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
				<Collapsible isOpen={!!form?.error?.message}>
					<Alert.Root variant="destructive">
						<ErrorIcon />
						<Alert.Title>Error</Alert.Title>
						<Alert.Description>{form?.error?.message}</Alert.Description>
					</Alert.Root>
				</Collapsible>
				<Field.Field>
					<Field.Label for="email">Email</Field.Label>
					<Input id="email" name="email" type="text" required />
					<FieldErrorList errors={form?.errors?.email} />
				</Field.Field>
				<PasswordField errors={form?.errors?.password} />
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
