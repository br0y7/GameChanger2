import type { RemoteFormIssue, SubmitFunction } from '@sveltejs/kit';
import type { Attachment } from 'svelte/attachments';

interface CreateEnhanceOptions {
	onStart?: () => void;
	onEnd?: () => void | Promise<void>;
	onSuccess?: () => void | Promise<void>;
}

/**
 * Returns a function that handles a common pattern for `use:enhance`.
 * @param options onStart, onEnd, onSuccess callbacks
 * @returns a SubmitFunction you can use with `use:enhance`
 */
export function createEnhanceHandler(options: CreateEnhanceOptions): SubmitFunction {
	return () => {
		options.onStart?.();

		return async ({ update, result }) => {
			try {
				await update();

				if (result.type === 'success') {
					await options.onSuccess?.();
				}
			} finally {
				await options.onEnd?.();
			}
		};
	};
}

export function focusFirstError({
	submitting,
	issues,
}: {
	submitting: boolean;
	issues?: RemoteFormIssue[];
}): Attachment {
	return (form) => {
		if (submitting || !issues?.length) {
			return;
		}
		const field = form.querySelector<HTMLElement>('[aria-invalid="true"]');
		field?.focus();
	};
}
