import type { FieldErrorsState, FormAction, ResourceTarget } from '$lib/forms/types';
import { error, fail, type NumericRange } from '@sveltejs/kit';
import { z, type ZodError } from 'zod';

export type ErrorMessageOptions = {
	message?: string;
	action?: FormAction;
};

function raise(
	status: NumericRange<400, 599>,
	defaultMessage: string,
	target: ResourceTarget,
	options: ErrorMessageOptions
): never {
	const { message = defaultMessage, action = 'create' } = options;
	error(status, `${message} ${action}:${target.resource} ${target.id ?? ''}`);
}

// Marking the return value as `never` helps TypeScript know that program flow
// will stop when these functions are called (since the error() above will throw).
// For some reason it doesn't like arrow functions,
// so keep these as named function declarations.

/**
 * Throws a 500 HTTP Error
 * @param target Specifies the target resource and maybe its id
 * @param options Optional error message and action
 * @throws HTTPError
 */
export function internal(target: ResourceTarget, options: ErrorMessageOptions = {}): never {
	raise(500, 'Something went wrong.', target, options);
}

/**
 * Throws a 401 HTTP Error
 * @param target Specifies the target resource and maybe its id
 * @param options Optional error message and action
 * @throws HTTPError
 */
export function unauthorized(target: ResourceTarget, options: ErrorMessageOptions = {}): never {
	raise(401, 'Unauthorized.', target, options);
}

/**
 * Throws a 403 HTTP Error
 * @param target Specifies the target resource and maybe its id
 * @param options Optional error message and action
 * @throws HTTPError
 */
export function forbidden(target: ResourceTarget, options: ErrorMessageOptions = {}): never {
	raise(403, 'Access denied', target, options);
}

/**
 * Throws a 400 HTTP Error
 * @param target Specifies the target resource and maybe its id
 * @param options Optional error message and action
 * @throws HTTPError
 */
export function badRequest(target: ResourceTarget, options: ErrorMessageOptions = {}): never {
	raise(400, 'Bad request', target, options);
}

/**
 * Throws a 404 HTTP Error
 * @param target Specifies the target resource and maybe its id
 * @param options Optional error message and action
 * @throws HTTPError
 */
export function notFound(target: ResourceTarget, options: ErrorMessageOptions = {}): never {
	raise(404, 'Not found', target, options);
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
