import type { FieldErrorsState, FormAction, ResourceTarget } from '$lib/forms/types';
import { fail } from '@sveltejs/kit';
import { z, type ZodError } from 'zod';

export type ErrorMessageOptions = {
	message?: string;
	action?: FormAction;
};

export function internal(target: ResourceTarget, options: ErrorMessageOptions = {}) {
	const { message = 'Something went wrong.', action = 'create' } = options;
	return fail(500, { action, target, error: message });
}

export function unauthorized(target: ResourceTarget, options: ErrorMessageOptions = {}) {
	const { message = 'Unauthorized.', action = 'create' } = options;
	return fail(401, { action, target, error: message });
}

export function forbidden(target: ResourceTarget, options: ErrorMessageOptions = {}) {
	const { message = 'Access denied.', action = 'create' } = options;
	return fail(403, { action, target, error: message });
}

export function badRequest(target: ResourceTarget, options: ErrorMessageOptions = {}) {
	const { message = 'Bad request', action = 'create' } = options;
	return fail(400, { action, target, error: message });
}

export type ValidationErrorOptions = {
	action?: FormAction;
};

export function parseError<TSchema>(
	error: ZodError<TSchema>,
	target: ResourceTarget,
	options: ValidationErrorOptions = {}
) {
	const { action = 'create' } = options;
	return fail(400, {
		...options,
		action,
		target,
		errors: z.flattenError(error).fieldErrors,
	});
}

export function validationError<TSchema>(
	errors: FieldErrorsState<TSchema>['errors'],
	target: ResourceTarget,
	options: ValidationErrorOptions = {}
) {
	const { action = 'create' } = options;
	return fail(400, { ...options, target, action, errors });
}
