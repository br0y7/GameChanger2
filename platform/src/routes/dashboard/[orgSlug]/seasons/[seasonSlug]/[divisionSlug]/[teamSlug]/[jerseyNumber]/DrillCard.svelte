<script lang="ts">
	import type { BasketballDrill } from '$lib/schemas/drill';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Drawer from '$lib/components/ui/drawer/index.js';
	import { buttonVariants } from '$lib/components/ui/button';
	import { cn } from '$lib/utils';
	import EyeIcon from '@lucide/svelte/icons/eye';
	import GaugeIcon from '@lucide/svelte/icons/gauge';
	import TimerIcon from '@lucide/svelte/icons/timer';

	interface Props {
		drill: BasketballDrill;
	}
	let { drill }: Props = $props();
</script>

<Card.Root class="flex h-full flex-col">
	<Card.Header>
		<Card.Title>{drill.name}</Card.Title>
		<Card.Description>{drill.description}</Card.Description>
	</Card.Header>
	<Card.Content class="flex-1 space-y-4">
		<div class="flex gap-4 text-sm">
			<div class="flex items-center gap-2 capitalize">
				<GaugeIcon class="h-4 w-4 shrink-0" />
				<span>{drill.difficulty}</span>
			</div>

			<div class="flex items-center gap-1">
				<TimerIcon class="h-4 w-4 shrink-0" />
				<span>{drill.duration}</span>
			</div>
		</div>
		<p>{drill.keyPoints}</p>
	</Card.Content>
	<Card.Footer class="flex justify-center">
		<Drawer.Root>
			<Drawer.Trigger class={cn('text-center', buttonVariants({ variant: 'default' }))}>
				<EyeIcon />
				View Instructions
			</Drawer.Trigger>
			<Drawer.Content class="max-h-[50svh]">
				<Drawer.Header>
					<Drawer.Title class="text-2xl">{drill.name} Instructions</Drawer.Title>
					<Drawer.Description class="flex justify-center gap-4 text-xl">
						<div class="flex gap-2 capitalize"><GaugeIcon />{drill.difficulty}</div>
						<div class="flex gap-1"><TimerIcon />{drill.duration}</div>
					</Drawer.Description>
				</Drawer.Header>
				<div class="my-auto flex h-full w-full flex-col items-center overflow-auto p-8">
					<ul class="flex max-w-sm flex-col gap-4 text-xl">
						{#each drill.instructions as instruction (instruction)}
							<li class="text-primary">
								{instruction}
							</li>
						{/each}
					</ul>
				</div>
				<Drawer.Footer class="flex items-center">
					<Drawer.Close class={cn('min-w-sm', buttonVariants({ variant: 'outline' }))}>
						Close
					</Drawer.Close>
				</Drawer.Footer>
			</Drawer.Content>
		</Drawer.Root>
	</Card.Footer>
</Card.Root>
