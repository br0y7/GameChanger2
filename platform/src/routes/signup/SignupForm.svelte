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
	import * as Alert from '$lib/components/ui/alert';
	import ErrorIcon from '@lucide/svelte/icons/circle-x';
	import InfoIcon from '@lucide/svelte/icons/info';
	import FieldErrorList from '$lib/components/FieldErrorList.svelte';
	import Collapsible from '$lib/components/Collapsible.svelte';
	import { goto } from '$app/navigation';
	import SubmitButton from '$lib/components/SubmitButton.svelte';

	let {
		class: className,
		form,
		...restProps
	}: HTMLAttributes<HTMLDivElement> & { form: PageProps['form'] } = $props();

	let submitting = $state(false);
</script>

<div class={cn('flex flex-col', className)} {...restProps}>
	<form
		method="POST"
		use:enhance={() => {
			submitting = true;

			return async ({ update }) => {
				try {
					await update();

					if (form?.success) {
						// TODO: think about player and follower flow
						await goto(resolve('/onboarding'));
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
					<h1 class="text-2xl font-bold">Create your account</h1>
					<Field.FieldDescription class="text-center">
						Get started to track stats, manage teams, and more.
					</Field.FieldDescription>
				</div>
				<Field.Field>
					<GoogleButton disabled={submitting} />
				</Field.Field>
				<Field.Separator>Or</Field.Separator>
				<Field.Field>
					<Field.Label for="name">Name</Field.Label>
					<Input id="name" name="name" type="name" required />
					<FieldErrorList errors={form?.errors?.name} />
				</Field.Field>
				<Field.Field>
					<Field.Label for="email">Email</Field.Label>
					<Input id="email" name="email" type="email" required />
					<FieldErrorList errors={form?.errors?.email} />
				</Field.Field>
				<PasswordField errors={form?.errors?.password} />
				<div class="flex flex-col items-center gap-3">
					<Field.Field>
						<SubmitButton {submitting}>Create Account</SubmitButton>
					</Field.Field>
					<Collapsible isOpen={!!form?.error?.message}>
						<Alert.Root variant="destructive">
							<ErrorIcon />
							<Alert.Title>Error</Alert.Title>
							<Alert.Description>{form?.error?.message}</Alert.Description>
						</Alert.Root>
					</Collapsible>
					<Field.Description>
						Already have an account? <a href={resolve('/login')}>Log In</a>
					</Field.Description>
				</div>
				<Alert.Root variant="no-border">
					<InfoIcon class="size-6 stroke-info" />
					<Alert.Title class="text-base text-info-foreground">Player, Parent, or Fan?</Alert.Title>
					<Alert.Description class="text-foreground">
						You need an invite link to join. Check your email for an invitation, or ask your coach
						or organizer for access.
					</Alert.Description>
				</Alert.Root>
			</Field.Group>
		</Field.Set>
	</form>
	<!-- <Field.Description class="px-6 text-center">
		By clicking continue, you agree to our <a href="#/">Terms of Service</a>
		and <a href="#/">Privacy Policy</a>.
	</Field.Description> -->
</div>
