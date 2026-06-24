import type { FieldErrorsState } from '$lib/forms/types';
import { fail } from '@sveltejs/kit';
import { z, type ZodError } from 'zod';

export function internal(message = 'Something went wrong.') {
	return fail(500, { error: message });
}

export function unauthorized(message = 'Unauthorized.') {
	return fail(401, { error: message });
}

export function forbidden(message = 'Access denied.') {
	return fail(403, { error: message });
}

export function parseError(error: ZodError) {
	return fail(400, {
		errors: z.flattenError(error).fieldErrors,
	});
}

export function validationError<TSchema>(errors: FieldErrorsState<TSchema>['errors']) {
	return fail(400, { errors });
}
