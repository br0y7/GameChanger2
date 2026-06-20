<script lang="ts">
	import { buttonVariants } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { cn } from '$lib/utils';

	let { children, title, description, callToAction, href } = $props();
</script>

<a {href}>
	<Card.Root
		class="flex flex-col border-2 
        hover:border-primary/40 hover:-translate-y-1 
        duration-300 transition-all"
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
</a>
