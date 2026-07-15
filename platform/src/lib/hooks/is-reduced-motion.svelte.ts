import { MediaQuery } from 'svelte/reactivity';

export class IsReducedMotion extends MediaQuery {
	constructor() {
		super('(prefers-reduced-motion: reduce)');
	}
}
