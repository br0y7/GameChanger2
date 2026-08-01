import type { Attachment } from 'svelte/attachments';

interface InViewOptions extends IntersectionObserverInit {
	once?: boolean;
	onEnter?: () => void;
	onExit?: () => void;
}

export function inView(options: InViewOptions): Attachment<HTMLElement> {
	return (node: HTMLElement) => {
		const { once = true, onEnter, onExit, threshold = 0.1, ...observerOptions } = options;

		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting) {
					onEnter?.();
					if (once) observer.unobserve(node);
				} else {
					onExit?.();
				}
			},
			{
				threshold,
				...observerOptions,
			}
		);
		observer.observe(node);

		return () => observer.disconnect();
	};
}
