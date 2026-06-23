<script lang="ts">
	import { buttonVariants } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { cn } from '$lib/utils';
	import type { Snippet } from 'svelte';
	import { enhance } from '$app/forms';
	import type { OnboardingOrgCreatorRole } from '$lib/onboarding/roles';

	interface Props {
		role: OnboardingOrgCreatorRole;
		title: string;
		description: string;
		callToAction: string;
		children: Snippet;
	}

	let { children, title, description, callToAction, role }: Props = $props();

	const getAccessibilityLabel = () => {
		switch (role) {
			case 'organizer':
				return 'Select League Organizer';
			case 'coach':
				return 'Select Coach';
			default:
				// Will not run, only for type safety.
				// If you add another role and not put a label
				// `satisies` will complain
				return `Select ${role satisfies OnboardingOrgCreatorRole[]}`;
		}
	};
</script>

<form method="post" use:enhance>
	<input type="hidden" name="role" value={role} />
	<button type="submit" aria-label={getAccessibilityLabel()}>
		<Card.Root
			class="flex flex-col border-2 
				hover:border-primary/40 hover:-translate-y-1 
				duration-300 transition-all
				cursor-pointer"
		>
			<Card.Header>
				<Card.Title class="text-xl text-center">{title}</Card.Title>
				<Card.Description>{description}</Card.Description>
			</Card.Header>
			<Card.Content class="flex-1">
				{@render children()}
			</Card.Content>
			<Card.Footer>
				<!-- Not a real button element for valid HTML (no nested button on anchors) -->
				<div class={cn(buttonVariants({ size: 'lg' }), 'w-full')}>
					{callToAction}
				</div>
			</Card.Footer>
		</Card.Root>
	</button>
</form>
