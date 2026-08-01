import type { FormAction, ResourceTarget } from '$lib/forms/types';
import { error, type NumericRange } from '@sveltejs/kit';

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
	const { message = defaultMessage, action = 'read' } = options;
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

/**
 * Throws a 500 HTTP Error, has default message about having no id
 * @param target Specifies the target resource and maybe the id
 * @param options Optional error message and action
 * @throws HTTPError
 */
export function internalNoId(target: ResourceTarget, options: ErrorMessageOptions = {}): never {
	const { action, message = `This should not happen, pass the ${target.resource} id` } = options;
	internal(target, { action, message });
}
