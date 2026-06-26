import type { SubmitFunction } from '@sveltejs/kit';

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

export function focusFirstError<TSchema>(
	refs: Partial<Record<keyof TSchema, HTMLElement | null>>,
	errors: Partial<Record<keyof TSchema, string[]>>
) {
	const [firstField] = Object.keys(errors) as (keyof TSchema)[];

	refs[firstField]?.focus();
}
