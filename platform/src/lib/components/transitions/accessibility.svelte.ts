import { IsReducedMotion } from '$lib/hooks/is-reduced-motion.svelte';
import { fade, type TransitionConfig } from 'svelte/transition';

type SvelteTransition<TParams> = (node: HTMLElement, params: TParams) => TransitionConfig;

/**
 * Wraps a Svelte transition to respect reduced-motion media query for accessibility.
 * @param originalTransition a transition from 'svelte/transition'
 * @returns transition you can with transition directive
 */
export function createAccessibleTransition<TParams>(originalTransition: SvelteTransition<TParams>) {
	const isReducedMotion = new IsReducedMotion();

	return (node: HTMLElement, options: TParams): TransitionConfig => {
		if (isReducedMotion.current) {
			// quick fade
			return fade(node, { ...options, duration: 100 });
		}

		return originalTransition(node, options);
	};
}
