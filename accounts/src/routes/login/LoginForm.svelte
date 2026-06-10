<script lang="ts">
	import ChartSplineIcon from '@lucide/svelte/icons/chart-spline';
	import { cn } from '$lib/utils.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Field from '$lib/components/ui/field/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import type { HTMLAttributes } from 'svelte/elements';
	import { resolve } from '$app/paths';
	import { env } from '$env/dynamic/public';
	import PasswordField from '$lib/components/PasswordField.svelte';
	import GoogleButton from '$lib/components/GoogleButton.svelte';

	let { class: className, ...restProps }: HTMLAttributes<HTMLDivElement> = $props();
</script>

<div class={cn('flex flex-col gap-6', className)} {...restProps}>
	<form>
		<Field.Group>
			<div class="flex flex-col items-center gap-2 text-center">
				<a href="#/" class="flex flex-col items-center gap-2 font-medium">
					<div class="flex size-8 items-center justify-center rounded-md">
						<ChartSplineIcon class="size-6" />
					</div>
					<span class="sr-only">{env.PUBLIC_APP_NAME}</span>
				</a>
				<h1 class="text-2xl font-bold">Welcome back</h1>
				<Field.FieldDescription
					>Sign in to check updates, manage teams, and more.</Field.FieldDescription
				>
			</div>
			<Field.Field>
				<GoogleButton />
			</Field.Field>
			<Field.Separator>Or</Field.Separator>
			<Field.Field>
				<Field.Label for="email">Email</Field.Label>
				<Input id="email" type="email" required />
			</Field.Field>
			<PasswordField />
			<Field.Field>
				<Button type="submit">Sign In</Button>
			</Field.Field>
			<div class="flex flex-col items-center">
				<Field.Description>
					Don't have an account? <a href={resolve('/signup')}>Create Account</a>
				</Field.Description>
			</div>
		</Field.Group>
	</form>
	<!-- <Field.Description class="px-6 text-center">
		By clicking continue, you agree to our <a href="#/">Terms of Service</a>
		and <a href="#/">Privacy Policy</a>.
	</Field.Description> -->
</div>
