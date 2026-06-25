import { MediaQuery } from 'svelte/reactivity';
import { fade, type TransitionConfig } from 'svelte/transition';

export const reducedMotion = new MediaQuery('(prefers-reduced-motion: reduce)');

type SvelteTransition<TParams> = (node: HTMLElement, params: TParams) => TransitionConfig;

/**
 * Wraps a Svelte transition to respect reduced-motion media query for accessibility.
 * @param originalTransition a transition from 'svelte/transition'
 * @returns transition you can with transition directive
 */
export function createAccessibleTransition<TParams>(originalTransition: SvelteTransition<TParams>) {
	return (node: HTMLElement, options: TParams): TransitionConfig => {
		if (reducedMotion.current) {
			// quick fade
			return fade(node, { ...options, duration: 100 });
		}

		return originalTransition(node, options);
	};
}
