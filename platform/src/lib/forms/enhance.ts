import type { RemoteFormIssue } from '@sveltejs/kit';
import type { Attachment } from 'svelte/attachments';

/**
 * Use this using `@attach` on a container or a form that
 * contains the fields (inputs, checkboxes, etc.).
 * If attached, it will focus the first error.
 *
 * @param submitting Reactive state for when there is
 * a form currently submitting.
 * @param issues An optional list of all the remote form's issues.
 * Tip: use `allIssues()` of a remote form.
 * @returns Svelte Attachment
 */
export function focusFirstError({
	submitting,
	issues,
}: {
	submitting: boolean;
	issues?: RemoteFormIssue[];
}): Attachment {
	return (container) => {
		if (submitting || !issues?.length) {
			return;
		}
		const element = container.querySelector<HTMLElement>('[aria-invalid="true"]');
		element?.focus();
	};
}
